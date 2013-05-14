var enet = require("../lib/enet");

var server = enet.createServer({
    address: new enet.Address("0.0.0.0",6666),
    peers:32,
    channels:1,
    down:0,
    up:0
});

server.on("ready",function(ip,port){
    console.log("server bound to:",ip,":",port);
});

server.on("connect",function(peer,data){
    console.log("peer connected");
    var s=server.createStream(peer,0);
    s.write("hello I'm the server!");
    s.pipe(process.stdout);
});

server.start(20);
