var enet=require("../lib/enet.js");

var _peer, server, client;

var _handlers = {
    connect: function(peer,data){
    	console.log("client connected. data=",data);
    },
    disconnect: function(peer,data){
    	console.log("client disconnected. data=",data);
    	process.exit();
    },
    message: function(peer,packet,channel){
    	console.log('packet data:',packet.data().toString(), "channel:",channel);
        //echo back the packet
    	//peer.send(channel, new enet.Packet(packet.data(),1));
    },
    telex: function(msg,rinfo){
        console.log("telex:",msg.toString());   
        console.log("from:",rinfo);
    }    
};
var counter = 1;
server = createHost("0.0.0.0",5000,5,_handlers,function(host){
    if(_peer) {	
        try{
    	 var packet=new enet.Packet( (counter++).toString(), enet.Packet.FLAG_RELIABLE);
    	 _peer.send(3,packet);
    	}catch(e){
    	    console.log(e);
    	}
    }
},1000);

client = createHost("0.0.0.0",5001,5,_handlers,function(host){


    var buf = new Buffer(JSON.stringify({
        '+end':'123213...',
        '_to':'172.16.200.1:42424'
    }), "utf8");

    host.send("127.0.0.1", 5001, buf);

    
},1000);

function createHost(ip,port,channels,handlers,tick,interval){    
    var addr = new enet.Address(ip,port);
    var host = new enet.Host(addr,channels);
    
    host.on("connect",handlers.connect);
    host.on("disconnect",handlers.disconnect);
    host.on("message",handlers.message);
    host.on("telex",handlers.telex);
    
    if(tick && interval){
        setInterval(function(){
            tick(host);
        },interval);
    }
    
//    host.start_watcher();
        
    return host;
}

 server.start();
 client.start();
_peer=server.connect( new enet.Address("127.0.0.1",5001), 5, 1337);
