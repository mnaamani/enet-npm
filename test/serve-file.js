var enet = require("enet");
var fs = require("fs");

var server = enet.createServer({
    address: new enet.Address("0.0.0.0",6666),
    peers:32,
    channels:1,
    down:0,
    up:0
});

server.on("connect",function(peer,data){
    var file = fs.createReadStream(process.argv[2]);

    file.on("end",function(){
        console.log("served file.");
        peer.disconnectLater();
    });
    
    file.pipe(server.createStream(peer,0));   
});

server.start(10);