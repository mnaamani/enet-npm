var enet = require("../lib/enet");

var s_addr = new enet.Address("255.255.255.255",6666);

var C = enet.createClient();

C.on("ready",function(ip,port){
    console.log("client socket bound to:",ip,":",port);
});

C.on("connect",function(peer,data){
    console.log("connected to:",peer.address().address());
    var packet = new enet.Packet( new Buffer("hello, I'm the client\n"),enet.Packet.FLAG_RELIABLE);
    peer.send(0,packet);
});

C.on("disconnect",function(peer,data){
    console.log("disconnected from:",peer.address().address());
});

C.on("message",function(peer,packet,chan){
  console.log("got message:",packet.data().toString());
  peer.disconnectNow();
  process.exit();
});

console.log("connecting...");

C.connect(s_addr,1,0);

C.start(50);
