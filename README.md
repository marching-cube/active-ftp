# Active FTP Client

This is a very basic implementation of an FTP client. 

It implements only active mode FTP, so unless you work with some old server setup, please consider using another library.

Inspired by <https://github.com/mscdex/node-ftp>. Use that for more common passive mode setups.

## How to use

Create a client object first:

```javascript
var FTPClient = require('ftpclient');
var client = new FTPClient({
    host: "192.168.1.123",
    user: 'user',
    pass: 'pass',
    client: "192.168.1.88",
    debug: false
});
```

Then you can perform one of the basic actions:

* Downloading a file
```javascript
client.download(filename, (error, contents) => {
    if (error) {
        // failure
    } else {
        // success, process contents
    }
})
```

* Uploading data
```javascript

client.upload(filename, data, error => {
    if (error) {
        // failure
    } else {
        // success
    }
})
```

* Listing directory
```javascript
client.list(directory, (error, list) => {
    if (error) {
        // failure
    } else {
        // success
    }
})
```


## Remarks

* Tested on vsftpd v2.2.2 and node.js v6.9.3.
* Calling multiple requests simultaneously on the same client object is not supported.
* There are not external necessary dependencies to run this library.
