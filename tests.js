const FTPClient = require('./ftpclient');

const config = {
    host: "127.0.0.1",
    user: 'user',
    pass: 'pass',
    client: "127.0.0.1"
}

const folder = "putdata"
const filename = "test.txt"


var client1 = new FTPClient(config);
client1.download(folder + "/" + filename, (error, contents) => {
    if (error) {
        console.log(error)
    } else {
        console.log(contents.toString('utf8'))
    }
})

var client2 = new FTPClient(config);
client2.upload(folder + "/" + filename, "ala ma kota", error => {
    if (error) {
        console.log(error)
    } else {
        console.log("OK")
    }
})

var client3 = new FTPClient(config);
client3.list(folder, (error, list) => {
    if (error) {
        console.log(error)
    } else {
        console.log(list)
    }
})