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
    peer.createWriteStream(peer,0).write("hello I'm the server!");    
    peer.createReadStream(0).pipe(process.stdout);
    setTimeout(function(){
       peer.disconnect();
    },2000);
});

server.start(20);
