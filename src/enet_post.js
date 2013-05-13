var events, util, Queue, DGRAM;
var global_packet_filter;
var Stream;

var ENET_HOST_SERVICE_INTERVAL = 30;//milli-seconds
var ENET_PACKET_FLAG_RELIABLE = 1;

events = require("events");
util = require("util");
DGRAM = require("dgram");
Stream = require("stream");

module.exports.init = function( pf_func){
    if(pf_func){
        _jsapi_init(1);
        global_packet_filter = pf_func;
    }else{
        _jsapi_init(0);
    }
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
     pointer = ccall('jsapi_enet_host_create_client', 'number', 
			['number','number','number','number'],
			[maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up || 0]);     

   }else{ //default is a server
     pointer = ccall('jsapi_enet_host_create', 'number', 
			['number','number','number','number','number','number'],
			[address.host(), address.port(),maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up || 0]);     
   }

   if(pointer==0){
	throw('failed to create ENet host');
   }
   self._event = new ENetEvent();//allocate memory for events - free it when we destroy the host
   self._pointer = pointer;

   var socketfd = ccall('jsapi_host_get_socket',"number",['number'],[self._pointer]);
   var socket = udp_sockets[socketfd]
   socket.on("listening",function(){
    socket.setBroadcast(true);
    self.emit('ready',socket.address().address,socket.address().port);
   });
}

ENetHost.prototype.__service = cwrap('enet_host_service','number',['number','number','number']);
ENetHost.prototype.service = function(){
   var self = this;
   var peer;

   if(!self._pointer || !self._event) return;
  try{
   var err = self.__service(self._pointer,self._event._pointer,0);
   while( err > 0){
	switch(self._event.type()){
		case 0:	//none
			break;
		case 1: //connect
            peer = self.connectedPeers[self._event.peerPtr()] || self._event.peer();
			self.emit("connect",
              peer,
			  self._event.data()
			);
            peer.emit("connect",self._event.data());
			break;			
		case 2: //disconnect
            peer = self.connectedPeers[self._event.peerPtr()] || self._event.peer();
			self.emit("disconnect",
              peer,
			  self._event.data()
			);
            peer.emit("disconnect",self._event.data());
            delete self.connectedPeers[peer._pointer];
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
		case 100: //rawpacket
			try{
			JSON.parse(self._event.packet().data().toString());
			self.emit("telex",
			  self._event.packet().data(),{
			    'address':self.receivedAddress().address(),
			    'port':self.receivedAddress().port()
 			  }
			);
			}catch(E){}
			self._event.packet().destroy();
			break;
	}
	err = self.__service(self._pointer,self._event._pointer,0);
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
   ccall("enet_host_destroy",'',['number'],[this._pointer]);
   delete self._pointer;
   delete self._event;
};
ENetHost.prototype.receivedAddress = function(){
	var ptr = ccall("jsapi_host_get_receivedAddress",'number',['number'],[this._pointer]);
	return new ENetAddress(ptr);
};
ENetHost.prototype.address = function(){
	//get node udp dgram.address()
	var socket = ccall('jsapi_host_get_socket',"number",['number'],[this._pointer]);
	var addr = udp_sockets[socket].address();
	return new ENetAddress(addr.address,addr.port);
};
ENetHost.prototype.send = function(ip, port,buff){
	var socket = ccall('jsapi_host_get_socket',"number",['number'],[this._pointer]);
	udp_sockets[socket].send(buff,0,buff.length,port,ip);
};
ENetHost.prototype.flush = function(){
	ccall('enet_host_flush',"",['number'],[this._pointer]);
};

ENetHost.prototype.connect = function(address,channelCount,data,connectCallback){
    var self = this;
    var peer;
	var ptr=ccall("jsapi_enet_host_connect","number",['number','number','number','number','number'],
		[this._pointer,address.host(),address.port(),channelCount||5,data||0]);

    if(ptr){
        peer = new ENetPeer(ptr);
        self.connectedPeers[ptr] = peer;
        if(connectCallback && (typeof connectCallback === 'function')){
          peer.on("connect",function(data){
            connectCallback.call(peer,undefined,peer,data);
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
	this._pointer = ccall("enet_packet_create","number",['number','number','number'],[0,buf.length,flags]);
        var begin = ccall("jsapi_packet_get_data","number",["number"],[this._pointer]);
        var end = begin + buf.length;
	var c=0,i=begin;
	for(;i<end;i++,c++){
		HEAPU8[i]=buf.readUInt8(c);
	}
    var callback_ptr = FUNCTION_TABLE.length;
    FUNCTION_TABLE[callback_ptr] = function(packet){
        self.emit("free");
        FUNCTION_TABLE[callback_ptr]=null;
    };
    FUNCTION_TABLE.push(0,0);
    ccall("jsapi_packet_set_free_callback","",["number","number"],[this._pointer,callback_ptr]);
    events.EventEmitter.call(this);
	return this;
  }
  if(arguments.length>0 && typeof arguments[0]=='string'){
	return new ENetPacket( new Buffer(arguments[0]), arguments[1]||0);
  }
};
ENetPacket.prototype.data = function(){
	var begin = ccall("jsapi_packet_get_data","number",["number"],[this._pointer]);
	var end = begin + ccall("jsapi_packet_get_dataLength","number",["number"],[this._pointer]);
	return new Buffer(HEAPU8.subarray(begin,end),"byte");
	//return HEAPU8.subarray(begin,end);
};
ENetPacket.prototype.dataLength = function(){
	return ccall("jsapi_packet_get_dataLength","number",["number"],[this._pointer]);
};
ENetPacket.prototype.destroy = function(){
	ccall("enet_packet_destroy",'',['number'],[this._pointer]);
};

ENetPacket.prototype.FLAG_RELIABLE = ENET_PACKET_FLAG_RELIABLE;

function ENetEvent(){
   this._pointer = ccall('jsapi_event_new','number');
};

ENetEvent.prototype.free = function(){
   ccall('jsapi_event_free','',['number'],[this._pointer]);
};

ENetEvent.prototype.type = function(){
   return ccall('jsapi_event_get_type','number',['number'],[this._pointer]);
};
ENetEvent.prototype.peer = function(){
   var ptr = ccall('jsapi_event_get_peer','number',['number'],[this._pointer]);
   return new ENetPeer(ptr);
};
ENetEvent.prototype.peerPtr = function(){
   return ccall('jsapi_event_get_peer','number',['number'],[this._pointer]);
};
ENetEvent.prototype.packet = function(){
   var ptr = ccall('jsapi_event_get_packet','number',['number'],[this._pointer]);
   return new ENetPacket(ptr);
};
ENetEvent.prototype.data = function(){
  return ccall('jsapi_event_get_data','number',['number'],[this._pointer]);
};
ENetEvent.prototype.channelID = function(){
 return ccall('jsapi_event_get_channelID','number',['number'],[this._pointer]);
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
	var hostptr = ccall('jsapi_address_get_host','number',['number'],[this._pointer]);
	return HEAPU32[hostptr>>2];
  }else{
	return this._host;
  }
};
ENetAddress.prototype.port = function(){
  if(this._pointer){
    return ccall('jsapi_address_get_port','number',['number'],[this._pointer]);
  }else{
    return this._port;
  }
};
ENetAddress.prototype.address = function(){ 
  if(this._pointer) return long2ip(this.host(),'ENetAddress.prototype.address from pointer');
  return long2ip(this.host(),'ENetAddress.prototype.address from local');
}

function ENetPeer(pointer){
  if(pointer) this._pointer = pointer; else throw("ENetPeer null pointer");
  events.EventEmitter.call(this);
  this.setMaxListeners(0);
};
ENetPeer.prototype.send = function(channel,packet,callback){
    var self = this;
    if(callback && callback instanceof Function){
      packet.on("free",function(){
        if(callback) callback.call(self);
      });
    }
	var ret = ccall('enet_peer_send','number',['number','number','number'],[this._pointer,channel,packet._pointer]);
	if(ret < 0) {
            callback = null;
            throw("enet.Peer send error");
    }
};
ENetPeer.prototype.receive = function(){
};
ENetPeer.prototype.reset = function(){
  ccall('enet_peer_reset','',['number'],[this._pointer]);
};
ENetPeer.prototype.ping = function(){
  ccall('enet_peer_ping','',['number'],[this._pointer]);
};
ENetPeer.prototype.disconnect = function(data){
  ccall('enet_peer_disconnect','',['number','number'],[this._pointer, data||0]);
};
ENetPeer.prototype.disconnectNow = function(data){
  ccall('enet_peer_disconnect_now','',['number','number'],[this._pointer,data||0]);
};
ENetPeer.prototype.disconnectLater = function(data){
  ccall('enet_peer_disconnect_later','',['number','number'],[this._pointer,data||0]);
};
ENetPeer.prototype.address = function(){
 var ptr = ccall('jsapi_peer_get_address','number',['number'],[this._pointer]);
 return new ENetAddress(ptr);
};

//turn a channel with peer into a node readable/writeable Stream
// ref: https://github.com/substack/stream-handbook
ENetHost.prototype.createStream = function(peer,channel){
    var s = new Stream();
    var totalPacketSizes = 0;

    s.readable = true;
    var paused = false;
    var host = this;

    host.on("disconnect",function(_peer){
        if(peer._pointer === _peer._pointer){
            if(s.writeable) s.destroy();
            s.readable = false;
            s.emit("end");
        }
    });

    host.on("message",function(_peer,_packet,_channel){
        if(peer._pointer === _peer._pointer &&
            channel === _channel ){
            if(!paused) s.emit("data",_packet.data());
                //else ... queue incoming packets
        }
    });

    s.writeable = true;

    s.write = function(buf){
        if(!buf.length) return;
        if(!s.writeable) return;
        var packet;
        try{
           packet = new ENetPacket(buf,ENET_PACKET_FLAG_RELIABLE);
           peer.send(channel, packet);
        }catch(e){
          s.destroy();//connection lost with peer
          return;
        }

        //dont allocate more than 256KByes of dynamic memory for outgoing packets
        totalPacketSizes += buf.length;
        packet.on("free",function(){//packets deallocated from memory (packet was sent)
            totalPacketSizes -= buf.length;
            if(totalPacketSizes < (262144)){
                s.emit("drain");//resume the stream 
            }
        });
        if(totalPacketSizes > (262144) ) return false;//pause stream that is piping into us
    };

    s.end = function(buf){
        if (arguments.length) s.write(buf);
        s.destroy();
    };
    
    s.destroy = function(){
        s.writeable = false;
    };

    //todo - proper backpressure implementation
    s.pause = function(){
        //paused = true;
    }
    s.resume = function(){
        //de-queue packets
        //paused = false;
    }

    return s;
};

/*
    Queue.js - Created by Stephen Morley 
    http://code.stephenmorley.org/ - released under the terms of
    the CC0 1.0 Universal legal code:
    http://creativecommons.org/publicdomain/zero/1.0/legalcode
*/

/* Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
 * items are added to the end of the queue and removed from the front.
 */
function Queue(){

  // initialise the queue and offset
  var queue  = [];
  var offset = 0;

  /* Returns the length of the queue.
   */
  this.getLength = function(){
    // return the length of the queue
    return (queue.length - offset);
  }

  /* Returns true if the queue is empty, and false otherwise.
   */
  this.isEmpty = function(){
    // return whether the queue is empty
    return (queue.length == 0);
  }

  /* Enqueues the specified item. The parameter is:
   *
   * item - the item to enqueue
   */
  this.enqueue = function(item){
    // enqueue the item
    queue.push(item);
  }

  /* Dequeues an item and returns it. If the queue is empty then undefined is
   * returned.
   */
  this.dequeue = function(){
    // if the queue is empty, return undefined
    if (queue.length == 0) return undefined;

    // store the item at the front of the queue
    var item = queue[offset];

    // increment the offset and remove the free space if necessary
    if (++ offset * 2 >= queue.length){
      queue  = queue.slice(offset);
      offset = 0;
    }
    // return the dequeued item
    return item;
  }

  /* Returns the item at the front of the queue (without dequeuing it). If the
   * queue is empty then undefined is returned.
   */
  this.peek = function(){
    // return the item at the front of the queue
    return (queue.length > 0 ? queue[offset] : undefined);
  }
}
