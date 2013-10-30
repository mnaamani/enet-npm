var enet = require("../lib/enet");

var s_addr = new enet.Address("127.0.0.1",6666);

var C = enet.createClient();

C.on("ready",function(ip,port){
    console.log("client socket bound to:",ip,":",port);
});

C.on("connect",function(peer,data){
    console.log("connected to:",peer.address().address());
    var packet = new enet.Packet( new Buffer("hello, I'm the client\n"),enet.Packet.FLAG_RELIABLE);
    peer.send(0,packet);
    peer.on("disconnect",function(){
      console.log("disconnected");
      C.destroy();
   });
});

C.on("message",function(peer,packet,chan){
  console.log("got message:",packet.data().toString());
});

console.log("connecting...");

C.connect(s_addr,1,0);

C.start(50);
