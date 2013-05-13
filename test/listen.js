var enet=require("../lib/enet.js");

var listen_port = process.argv[2] || 5000;

var server;

var _handlers = {
    connect: function(peer,data){
        console.log("client connected. data: "+data);
    },
    disconnect: function(peer,data){
        console.log("client disconnected. data: "+data);
    },
    message: function(peer,packet,channel){
        if(typeof alert !== 'undefined') alert("Msg:"+packet.data().toString()+"\nChannel:"+channel);
        console.log('packet data: '+packet.data().toString()+" channel: "+channel);
        var packet = new enet.Packet(packet.data(),1);
        peer.send(channel, packet,function(){
            console.log("packet sent!");
        });
    },
    telex: function(msg,rinfo){        
        console.log("telex:"+msg.toString());
        console.log("from:"+rinfo.address);
    }    
};

server = createHost("0.0.0.0",listen_port,5,_handlers,function(host){
    console.log("_");
},3000);

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
    return host;
}

server.start();
