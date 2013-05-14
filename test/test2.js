var enet=require("../lib/enet.js");

//init enet with a packet filter.. 
enet.init(function(ip,port){
    //return 0 //to drop the packet
    //return 1 //to allow the packet through
    console.error("packet source:",ip,port);
    return 1;
});

var addr1 = new enet.Address("0.0.0.0",5000);
var server = new enet.Host(addr1,32);

server.on("connect",function(peer,data){
	console.log("peer connected. data=",data);
	console.log("peer address:",peer.address().address()+":"+peer.address().port());
	var packet = new enet.Packet("Bye Bye",1);
	peer.send(1,packet);
	peer.disconnectLater();
});

var client = new enet.Host( new enet.Address("0.0.0.0",0),32);

client.on("ready",function(){
    console.log("host ready address:", client.address().address(), client.address().port());
    client.connect(new enet.Address("127.0.0.1",5000),5,6969,function(err,peer,data){
        if(err) process.exit();
        peer.on("disconnect",function(){
        	console.log("client got disconnect");
        	server.destroy();
        	client.destroy();
        	process.exit();
        });
        peer.on("message",function(packet,channel){
	        console.log("got message:",packet.data().toString(),"on channel",channel);
        });
    });
});

server.start();
client.start();
