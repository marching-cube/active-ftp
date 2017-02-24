var net = require('net')

function FTPClient(config) {
    this._config = config
    this._codeError = (code, expected) => this._error("FTP_RESPONSE_ERROR/Expected " + expected + ", but received " + code)
}

FTPClient.prototype._sendUser = function () {
    this._sendCommand("USER " + this._config.user, this._sendPass, 331)
}

FTPClient.prototype._sendPass = function () {
    this._sendCommand("PASS " + this._config.pass, this._sendType, 230)
}

FTPClient.prototype._sendType = function () {
    this._sendCommand("TYPE I", this._sendPort, 200)
}

FTPClient.prototype._sendPort = function () {
    this._sendCommand("PORT " + this._config.client.replace(/\./g, ',') + "," + parseInt((this._cmdSocket.localPort + 1) / 256) + "," + ((this._cmdSocket.localPort + 1) % 256), this._callback, 200)
}

FTPClient.prototype._waitForDownloadComplete = function (code) {
    if (code === 150) {
        // OK
    } else if (code === 226) {
        // Remark: it is possible that 226 is received, before actual data transfer is complete => race condition
        this._downloadAction = () => {
            var result = this._buffers.length ? Buffer.concat(this._buffers) : Buffer.from("")
            this._callback(result)
            this._downloadAction = undefined
        }
        if (this._dataSocketClosed) this._downloadAction()
    } else {
        this._codeError(code, "150 or 226")
    }
}

FTPClient.prototype._waitForUploadComplete = function (code) {
    if (code === 150) {
        // Remark: it is possible that 150 is received, before data socket is opened => race condition
        this._uploadAction = () => {
            this._dataSocket.write(this._buffers[0])
            this._dataSocket.end()
            this._buffers = []
            this._uploadAction = undefined
        }
        if (this._dataSocket) this._uploadAction()
    } else if (code === 226) {
        this._callback()
    } else {
        this._codeError(code, "150 or 226")
    }
}

FTPClient.prototype._sendCommand = function (command, callback, expected) {
    var _this = this
    if (this._config.debug) console.log("> " + command)
    this._next = code => {
        if (expected && code !== expected) {
            this._codeError(code, expected)
        } else if (callback) {
            callback.call(_this, code)
        }
    }
    this._cmdSocket.write(command + '\r\n')
}

FTPClient.prototype._connect = function (callback) {

    this._next = this._sendUser
    this._callback = callback
    this._cmdSocket = new net.Socket()
    this._cmdSocket.connect(21, this._config.host, () => {
        if (this._config.debug) console.log('Connected to ' + this._config.host + ":21")
        this._dataServer.listen(this._cmdSocket.localPort + 1, this._config.client);
    })

    this._dataServer = net.createServer(socket => {
        this._dataSocket = socket
        if (this._downloadAction) this._downloadAction()
        if (this._uploadAction) this._uploadAction()
        socket.on('data', d => this._buffers.push(d))
        socket.on('close', () => this._downloadAction ? _downloadAction() : this._dataSocketClosed = true)
    })

    this._cmdSocket.on('data', data => {
        var responses = data.toString().split('\r\n')
        for (var response of responses) {
            if (response.trim().length) {
                if (this._config.debug) console.log("< " + response.toString() + '\n')
                var code = parseInt(response.toString().split(" ")[0])
                if (this._next) this._next(code)
            }
        }
    })

    this._dataServer.on('error', this._error)
    this._cmdSocket.on('error', this._error)
}

FTPClient.prototype._list = function (folder, callback) {
    this._callback = result => callback(result.toString())
    folder = folder || ""
    this._buffers = []
    this._sendCommand("LIST " + folder, this._waitForDownloadComplete)
}

FTPClient.prototype._retrieve = function (filename, callback) {
    this._callback = callback
    this._buffers = []
    this._sendCommand("RETR " + filename, this._waitForDownloadComplete)
}

FTPClient.prototype._store = function (filename, data, callback) {
    this._callback = callback
    this._buffers = [data]
    this._sendCommand("STOR " + filename, this._waitForUploadComplete)
}

FTPClient.prototype._close = function (callback) {
    this._sendCommand("QUIT", () => {
        this._callback = undefined
        this._cmdSocket.on('close', () => callback())
        this._cmdSocket.destroy()
        this._dataServer.close()
    })
}

FTPClient.prototype._forceClose = function (callback) {
    this._sendCommand("QUIT")
    this._callback = undefined
    if (this._cmdSocket) this._cmdSocket.destroy()
    if (this._dataServer) this._dataServer.close()
    setTimeout(() => callback(), 100)
}

// META API

FTPClient.prototype._performPublicAction = function(callback, action) {
    this._error = code => {
        this._forceClose(() => {
            callback(code)
        })
    }
    this._connect(() => {
        action(result => {
            this._close(() => {
                callback(undefined, result)
            })
        })
    })
}

// PUBLIC API

FTPClient.prototype.download = function(filename, callback) {
    this._performPublicAction(callback, innerCallback => {
        this._retrieve(filename, innerCallback)
    })
}

FTPClient.prototype.upload = function(filename, data, callback) {
    this._performPublicAction(callback, innerCallback => {
        this._store(filename, data, innerCallback)
    })
}

FTPClient.prototype.list = function(folder, callback) {
    this._performPublicAction(callback, innerCallback => {
        this._list(folder, list => {
            var files = list.split('\r\n').map(row => row.substr(row.lastIndexOf(" ") + 1))
            files.pop()
            innerCallback(files)
        })
    })
}

module.exports = FTPClient