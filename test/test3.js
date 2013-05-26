var enet=require("../lib/enet.js");

var addr1 = new enet.Address("0.0.0.0",5000);
var server = new enet.Host(addr1,32);

server.on("connect",function(peer,data){
	console.log("client connected. data=",data);
	console.log("client address:",peer.address().address()+":"+peer.address().port());
	var packet1 = new enet.Packet("Bye Bye1",1);
	peer.send(1,packet1,function(err){
        if(!err) console.log("packet1 sent");
    });
	peer.disconnectLater();
});

var client = new enet.Host( new enet.Address("0.0.0.0",0),32);

function doClientConnect(connectData){
    client.connect(new enet.Address("127.0.0.1",5000),5,connectData,function(err,peer,data){
        if(err) process.exit();
        peer.on("disconnect",function(){
        	console.log("client got disconnect");
        });
        peer.on("message",function(packet,channel){
	        console.log("got message:",packet.data().toString(),"on channel",channel);
        });
    });
}

client.on("ready",function(){
    console.log("host ready address:", client.address().address(), client.address().port());
    /* an enet host can accept and make multiple connections to/from the same host */
    doClientConnect(123);
    doClientConnect(456);
});

server.start();
client.start();
