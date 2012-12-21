var enet=require("../lib/enet");

enet.init(false);

var client = new enet.Host( new enet.Address("0.0.0.0",0),32);

var peer = client.connect(new enet.Address("172.16.200.127",5000),5,40000);

client.on("disconnect",function(){
	console.log("disconnected.");
	client.destroy();
	process.exit();
});

client.on("connect",function(){
    console.log("connected, sending packet and ping!");
    var packet = new enet.Packet(new Buffer("Bye Bye"),1);
    peer.send(1,packet);
    peer.ping();
});

client.on("message",function(peer,packet,channel,data){
	console.log("got message:",packet.data().toString(),"on channel",channel);
    peer.disconnectLater();
    console.log("disconnecting...");
});

client.start();
