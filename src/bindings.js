var Buffer = require("buffer").Buffer;
var events = require("events");
var util = require("util");
var Stream = require("stream");

var ENETModule = moduleScope.Module;
var jsapi_ = moduleScope.Module.jsapi;
var enet_ = moduleScope.Module.libenet;

var ENET_HOST_SERVICE_INTERVAL = 30;//milli-seconds
var ENET_PACKET_FLAG_RELIABLE = 1;

module.exports.init = function(func){
    var funcPointer = ENETModule["Runtime_addFunction"](function(host_ptr){
           var addr = new ENetAddress(jsapi_.host_get_receivedAddress(host_ptr));
           return func(addr.address(),addr.port());
     });
    jsapi_.init(funcPointer);
};

module.exports.Host = ENetHost;
module.exports.Address = ENetAddress;
module.exports.Packet = ENetPacket;
module.exports.inet_ip2long=ip2long;
module.exports.inet_long2ip=long2ip;

util.inherits(ENetHost, events.EventEmitter);
util.inherits(ENetPacket, events.EventEmitter);
util.inherits(ENetPeer, events.EventEmitter);

module.exports.createServer = function(P){
    if(P) return new ENetHost(P.address,P.peers,P.channels,P.down,P.up,"server");
}
module.exports.createClient = function(P){
    var client;
    if(P){
        client = new ENetHost(undefined,P.peers,P.channels,P.down,P.up,"client");
    }else{
        client = new ENetHost(undefined,32,5,0,0,"client");
    }
    return client;
}

function ENetHost(address,maxpeers,maxchannels,bw_down,bw_up,host_type){
   events.EventEmitter.call(this);
   this.setMaxListeners(0);
   this.connectedPeers = {};

   var self = this;
   var pointer = 0;

   //ENetHost from pointer
   if(arguments.length === 1 && (typeof address === 'number') ){
      pointer = address;
      self._pointer = pointer;
      self._event =  new ENetEvent();
      return self;
   }

   if(host_type==='client'){
     pointer = jsapi_.enet_host_create_client(maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up || 0);

   }else{ //default is a server
     pointer = jsapi_.enet_host_create(address.host(), address.port(),maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up || 0);
   }

   if(pointer==0){
	throw('failed to create ENet host');
   }
   self._event = new ENetEvent();//allocate memory for events - free it when we destroy the host
   self._pointer = pointer;
   var socketfd = jsapi_.host_get_socket(self._pointer);
   var socket = self._socket = ENETModule["GetSocket"](socketfd);
   if(socket._bound || socket.__receiving){
        setTimeout(function(){
            socket.setBroadcast(true);
            self.emit('ready',socket.address().address,socket.address().port);
        },20);
   }else{
     socket.on("listening",function(){
       socket.setBroadcast(true);
       self.emit('ready',socket.address().address,socket.address().port);
     });
   }
}

ENetHost.prototype.service = function(){
   var self = this;
   var peer;
   var recvdAddr;

   if(!self._pointer || !self._event) return;
  try{
   var err = enet_.host_service(self._pointer,self._event._pointer,0);
   while( err > 0){
	switch(self._event.type()){
		case 0:	//none
			break;
		case 1: //connect
            peer = self.connectedPeers[self._event.peerPtr()];
            if(peer){
                //outgoing connection
                peer.emit("connect");
    			self.emit("connect",
                  peer,
		    	  undefined,
                  true
			    );
            }else{
                peer = self.connectedPeers[self._event.peerPtr()]=self._event.peer(); 
                //incoming connection
    			self.emit("connect",
                  peer,
		    	  self._event.data(),
                  false
			    );
            }
			break;			
		case 2: //disconnect
            peer = self.connectedPeers[self._event.peerPtr()];
            if(peer){
                peer.emit("disconnect",self._event.data());
                delete self.connectedPeers[peer._pointer];
            }
			break;
		case 3: //receive
            peer = self.connectedPeers[self._event.peerPtr()] || self._event.peer();
			self.emit("message",
              peer,
			  self._event.packet(),
			  self._event.channelID()
			);
            peer.emit("message",self._event.packet(),self._event.channelID());
			self._event.packet().destroy();
			break;
		case 100: //JSON,telex
            recvdAddr = self.receivedAddress();
			self.emit("telex",
			  self._event.packet().data(),{
			    'address':recvdAddr.address(),
			    'port':recvdAddr.port()
 			  }
			);
			self._event.packet().destroy();
			break;
	}
	err = enet_.host_service(self._pointer,self._event._pointer,0);
   }
  }catch(e){
   //console.log(e);
   if(err < 0) console.error("error servicing host: ",err);
  }
};

ENetHost.prototype.destroy = function(){
   var self = this;
   self.stop();
   self._event.free();
   enet_.host_destroy(this._pointer);
   delete self._pointer;
   delete self._event;
};
ENetHost.prototype.receivedAddress = function(){
	var ptr = jsapi_.host_get_receivedAddress(this._pointer);
	return new ENetAddress(ptr);
};
ENetHost.prototype.address = function(){
	var addr = this._socket.address();
	return new ENetAddress(addr.address,addr.port);
};
ENetHost.prototype.send = function(ip, port,buff,callback){
	this._socket.send(buff,0,buff.length,port,ip,callback);
};
ENetHost.prototype.flush = function(){
	enet_.host_flush(this._pointer);
};

ENetHost.prototype.connect = function(address,channelCount,data,connectCallback){
    var self = this;
    var peer;
	var ptr=jsapi_.enet_host_connect(this._pointer,address.host(),address.port(),channelCount||5,data||0);
    var succeeded = false;
    if(ptr){
        peer = new ENetPeer(ptr);
        self.connectedPeers[ptr] = peer;
        if(connectCallback && (typeof connectCallback === 'function')){
          peer.on("connect",function(){
            succeeded = true;
            connectCallback.call(self,undefined,peer);
          });
          peer.on("disconnect",function(){
            if(!succeeded) connectCallback.call(self,new Error("timeout"));
          });
        }
    	return peer;
    }else{
        //ptr is NULL - number of peers exceeded
        if(connectCallback && (typeof connectCallback === 'function')){
            connectCallback.call(null,new Error("maxpeers"));
            return undefined;
        }
    }
};
ENetHost.prototype.start_watcher = function( ms_interval ){
   if(this._io_loop) return;
   var self=this;
   self._io_loop = setInterval(function(){
	self.service();
   },ms_interval || ENET_HOST_SERVICE_INTERVAL);
};
ENetHost.prototype.stop_watcher = function(){
  if(this._io_loop){
	clearInterval(this._io_loop);	
  }
};
ENetHost.prototype.start = ENetHost.prototype.start_watcher;
ENetHost.prototype.stop = ENetHost.prototype.stop_watcher;

function ENetPacket(pointer){
  var self = this;
  if(arguments.length==1 && typeof arguments[0]=='number'){
	this._pointer = arguments[0];
	return this;
  }
  if(arguments.length>0 && typeof arguments[0]=='object'){
	//construct a new packet from node buffer
	var buf = arguments[0];
	var flags = arguments[1] || 0;
	this._pointer = enet_.packet_create(0,buf.length,flags);
        var begin = jsapi_.packet_get_data(this._pointer);
        var end = begin + buf.length;
	var c=0,i=begin;
	for(;i<end;i++,c++){
		ENETModule["HEAPU8"][i]=buf.readUInt8(c);
	}

    var callback_ptr = ENETModule["Runtime_addFunction"](function(packet){
        self.emit("free");
        ENETModule["Runtime_removeFunction"](callback_ptr);
    });
    jsapi_.packet_set_free_callback(this._pointer,callback_ptr);
    events.EventEmitter.call(this);
	return this;
  }
  if(arguments.length>0 && typeof arguments[0]=='string'){
	return new ENetPacket( new Buffer(arguments[0]), arguments[1]||0);
  }
};
ENetPacket.prototype.data = function(){
	var begin = jsapi_.packet_get_data(this._pointer);
	var end = begin + jsapi_.packet_get_dataLength(this._pointer);
	return new Buffer(ENETModule["HEAPU8"].subarray(begin,end),"byte");
	//return HEAPU8.subarray(begin,end);
};
ENetPacket.prototype.dataLength = function(){
	return jsapi_.packet_get_dataLength(this._pointer);
};
ENetPacket.prototype.destroy = function(){
	enet_.packet_destroy(this._pointer);
};

ENetPacket.prototype.FLAG_RELIABLE = ENET_PACKET_FLAG_RELIABLE;

function ENetEvent(){
   this._pointer = jsapi_.event_new();
};

ENetEvent.prototype.free = function(){
   jsapi_.event_free(this._pointer);
};

ENetEvent.prototype.type = function(){
   return jsapi_.event_get_type(this._pointer);
};
ENetEvent.prototype.peer = function(){
   var ptr = jsapi_.event_get_peer(this._pointer);
   return new ENetPeer(ptr);
};
ENetEvent.prototype.peerPtr = function(){
   return jsapi_.event_get_peer(this._pointer);
};
ENetEvent.prototype.packet = function(){
   var ptr = jsapi_.event_get_packet(this._pointer);
   return new ENetPacket(ptr);
};
ENetEvent.prototype.data = function(){
  return jsapi_.event_get_data(this._pointer);
};
ENetEvent.prototype.channelID = function(){
 return jsapi_.event_get_channelID(this._pointer);
};

function ENetAddress(){
   if(arguments.length==1 && typeof arguments[0]=='object'){
	this._host = arguments[0].host();
	this._port = arguments[0].port();
	return this;
   }
   if(arguments.length==1 && typeof arguments[0]=='number'){
	this._pointer = arguments[0];
	return this;
   }
   if(arguments.length==1 && typeof arguments[0]=='string'){
	var ipp =arguments[0].split(':');
	this._host = ip2long(ipp[0]);
	this._port = ipp[1]||0;
	return this;
   }
   if(arguments.length==2){
	if(typeof arguments[0] == 'string'){
		this._host = ip2long((arguments[0]));
	}else{
		this._host = arguments[0];
	}
	this._port = arguments[1];
	return this;
   }
   throw("bad parameters creating ENetAddress");
};
ENetAddress.prototype.host = function(){
  if(this._pointer){
	var hostptr = jsapi_.address_get_host(this._pointer);
	return ENETModule["HEAPU32"][hostptr>>2];
  }else{
	return this._host;
  }
};
ENetAddress.prototype.port = function(){
  if(this._pointer){
    return jsapi_.address_get_port(this._pointer);
  }else{
    return this._port;
  }
};
ENetAddress.prototype.address = function(){ 
  if(this._pointer) return long2ip(this.host(),'ENetAddress.prototype.address from pointer');
  return long2ip(this.host(),'ENetAddress.prototype.address from local');
};

function ENetPeer(pointer){
  if(pointer) this._pointer = pointer; else throw("ENetPeer null pointer");
  events.EventEmitter.call(this);
  this.setMaxListeners(0);
};
ENetPeer.prototype.send = function(channel,packet,callback){
    var self = this;
    if(packet instanceof Buffer) packet = new ENetPacket(packet,ENET_PACKET_FLAG_RELIABLE);
    if(callback && callback instanceof Function){
      packet.on("free",function(){
        if(callback) callback.call(self,undefined);
      });
    }
	if(enet_.peer_send(this._pointer,channel,packet._pointer) !== 0 ){
        if(callback) callback.call(self,new Error('Packet not queued'));
    }
};
ENetPeer.prototype.receive = function(){
};
ENetPeer.prototype.reset = function(){
  enet_.peer_reset(this._pointer);
};
ENetPeer.prototype.ping = function(){
  enet_.peer_ping(this._pointer);
};
ENetPeer.prototype.disconnect = function(data){
  enet_.peer_disconnect(this._pointer, data||0);
};
ENetPeer.prototype.disconnectNow = function(data){
  enet_.peer_disconnect_now(this._pointer,data||0);
};
ENetPeer.prototype.disconnectLater = function(data){
  enet_.peer_disconnect_later(this._pointer,data||0);
};
ENetPeer.prototype.address = function(){
 var ptr = jsapi_.peer_get_address(this._pointer);
 return new ENetAddress(ptr);
};

//turn a channel with peer into a node writeable Stream
// ref: https://github.com/substack/stream-handbook
ENetPeer.prototype.createWriteStream = function(channel){
    var peer = this;
    var s = new Stream.Writable();

    peer.on("disconnect",function(data){
            s.emit("end");
    });

    s._write = function(buf,enc,next){
        if(!buf.length) return;
        var packet = new ENetPacket(buf,ENET_PACKET_FLAG_RELIABLE);
        peer.send(channel, packet,function(err){
            if(err) {
                next(err);
                return;
            }
            next();
        });
    };

    return s;
};

ENetPeer.prototype.createReadStream = function(channel){
    var peer = this;
    var s = new Stream.Readable();

    peer.on("disconnect",function(data){
            s.emit("end");
    });

    peer.on("message",function(_packet,_channel){
        if(channel === _channel ){
            s.push(_packet.data());
        }
    });

    s._read = function(size){};

    return s;
};
function ip2long(ipstr){
    var b = ipstr.split('.');
    return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
}
function long2ip(addr){
    return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff);
}
