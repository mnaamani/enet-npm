var events, util, Queue, DGRAM;
var ENET_HOST_SERVICE_INTERVAL = 30;//milli-seconds
var global_packet_filter;

events = require("events");
util = require("util");
DGRAM = require("dgram");

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

if(events && util ) util.inherits(ENetHost, events.EventEmitter);

function ENetHost(address,maxchannels,maxpeers){
   if(events){
      events.EventEmitter.call(this);
   }else{
       this._events = {};
   }

   var self = this;
   var pointer = ccall('jsapi_enet_host_create', 'number', 
			['number','number','number','number','number','number'],
			[address.host(), address.port(),maxpeers || 128, maxchannels || 5, 0, 0]);
   if(pointer==0){
	throw('failed to create ENet host');
   }
   self._event = new ENetEvent();//allocate memory for - free it when we destroy the host
   self._pointer = pointer;
   self._socket_bound = false;
}

if(!events){
    ENetHost.prototype.on = function(e,cb){
        this._events[e] ? this._events[e].push(cb) : this._events[e]=[cb];
    };
    ENetHost.prototype.emit = function(){
        //used internally to fire events
        //'apply' event handler function  to 'this' channel pass eventname and Object O
        var self = this;
        var e = arguments[0];
        var params = Array.prototype.slice.apply(arguments,[1]);
        if(this._events && this._events[e]){
            this._events[e].forEach(function(cb){
                cb.apply(self,params);
            });
        }
    };
}

ENetHost.prototype.__service = cwrap('enet_host_service','number',['number','number','number']);
ENetHost.prototype.service = function(){
   var self = this;
   if(!self._pointer || !self._event) return;
  try{
	if(!self._socket_bound){
                //keep checking until the port is non 0
                if(self.address().port()!=0){
                    self._socket_bound=true;
                    self.emit('ready',self.address().address(),self.address().port());
                }
         }

   var err = self.__service(self._pointer,self._event._pointer,0);
   while( err > 0){
	switch(self._event.type()){
		case 0:	//none
			break;
		case 1: //connect
			self.emit("connect",
			  self._event.peer(),
			  self._event.data()
			);
			break;			
		case 2: //disconnect
			self.emit("disconnect",
			  self._event.peer(),
			  self._event.data()
			);
			break;
		case 3: //receive
			self.emit("message",
			  self._event.peer(),
			  self._event.packet(),
			  self._event.channelID(),
			  self._event.data()
			);
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
ENetHost.prototype.connect = function(address,channelCount,data){
	var ptr=ccall("jsapi_enet_host_connect","number",['number','number','number','number','number'],
		[this._pointer,address.host(),address.port(),channelCount||5,data||0]);

	return new ENetPeer(ptr);
};
ENetHost.prototype.start_watcher = function(){
   if(this._io_loop) return;
   var self=this;
   self._io_loop = setInterval(function(){
	self.service();
   },ENET_HOST_SERVICE_INTERVAL);
};
ENetHost.prototype.stop_watcher = function(){
  if(this._io_loop){
	clearInterval(this._io_loop);	
  }
};
ENetHost.prototype.start = ENetHost.prototype.start_watcher;
ENetHost.prototype.stop = ENetHost.prototype.stop_watcher;

function ENetPacket(pointer){
  if(arguments.length==1 && typeof arguments[0]=='number'){
	this._pointer = arguments[0];
	//console.log("Wrapping ENetPacket Pointer", this._pointer);
	return this;
  }
  if(arguments.length>0 && typeof arguments[0]=='object'){
	//construct a new packet from node buffer
	var buf = arguments[0];
	var flags = arguments[1] || 0;
	this._pointer = ccall("enet_packet_create","number",['number','number','number'],[0,buf.length,flags]);
	//console.log("ENetPacket malloc'ed",this._pointer);
        var begin = ccall("jsapi_packet_get_data","number",["number"],[this._pointer]);
        var end = begin + buf.length;
	var c=0,i=begin;
	for(;i<end;i++,c++){
		HEAPU8[i]=buf.readUInt8(c);
	}
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

ENetPacket.prototype.FLAG_RELIABLE = 1;

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
};
ENetPeer.prototype.send = function(channel,packet){
	var ret = ccall('enet_peer_send','number',['number','number','number'],[this._pointer,channel,packet._pointer]);
	if(ret < 0) throw("enet.Peer send error");
	//console.log("enet_peer_send return value:",ret);
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

function __packet_filter (host_ptr){
   var ip,port,data;
   return global_packet_filter(ip,port,data);
}

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
