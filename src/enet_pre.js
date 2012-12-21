var events, util, Queue, DGRAM;

var ENET_HOST_SERVICE_INTERVAL = 30;//milli-seconds

var global_packet_filter;

if (typeof exports !== 'undefined') {

    events = require("events");
    util = require("util");
    Queue = require("./Queue");
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

  } else {

    Queue = root.Queue;

    root.ENET = {   
        init : _jsapi_init,
        Host : ENetHost,
        Address : ENetAddress,
        Packet : ENetPacket,
        inet_ip2long : ip2long,
        inet_long2ip : long2ip
    }  
}

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
  try{
	if(!self._socket_bound){
                //keep checking until the port is non 0
                if(self.address().port()!=0){
                    self._socket_bound=true;
                    self.emit('ready');
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
   console.log(e);
   if(err < 0) console.error("error servicing host: ",err);
  }
};

ENetHost.prototype.destroy = function(){
   var self = this;
   self.stop();
   self._event.free();
   ccall("enet_host_destroy",'',['number'],[this._pointer]);
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
  if(pointer) this._pointer = pointer; else throw("improper use of ENetPeer");
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

var udp_sockets_count=0;
var udp_sockets = {};

var global_udp_callback = function(msg,rinfo,sfd){
    //que each packet it will be de-queed when recvmsg() is called
    var udpsocket = udp_sockets[sfd];
    if(udpsocket){
        udpsocket.packets.enqueue({
            data:msg,
            dataLength:msg.length,
            ip:rinfo.address,
            port:rinfo.port
        });
    }
}

function long2ip(l, source) {
    if(l<0){
	 throw('long2ip got a negative number!');
    }
    with (Math) {   
        var ip1 = floor(l/pow(256,3));
        var ip2 = floor((l%pow(256,3))/pow(256,2));
        var ip3 = floor(((l%pow(256,3))%pow(256,2))/pow(256,1));
        var ip4 = floor((((l%pow(256,3))%pow(256,2))%pow(256,1))/pow(256,0));
    }
    return ip1 + '.' + ip2 + '.' + ip3 + '.' + ip4;
}
function ip2long(ip) {
    var ips = ip.split('.');
    var iplong = 0;
    with (Math) {
        iplong = ips[0]*pow(256,3)+ips[1]*pow(256,2)+ips[2]*pow(256,1)+ips[3]*pow(256,0);
    }
    if(iplong<0) throw ('ip2long produced a negative number! '+iplong);
    return iplong;
}

function BufferConcat( buffers ){
    var totalLength = 0;
    buffers.forEach(function(B){
        totalLength = totalLength + B.length;
    });    
    var buf = new Buffer(totalLength);
    var i = 0;
    buffers.forEach(function(B){
        for(var b=0; b<B.length;b++){
            buf[i]=B[b];
            i++;
        }
    });
    return buf;
}

function C_String_to_JS_String(ptr){
    var str = "";
    var i = 0;
    while (HEAP8[((ptr)+(i))]){         
         str = str + String.fromCharCode(HEAPU8[((ptr)+(i))]);
         i++; // Note: should be |!= 0|, technically.
    }
    return str;
}
function JS_String_to_CString(jstr, ptr){
    var i=0;
    for(;i<jstr.length;){
        HEAPU8[(((ptr+i)|0))]=jstr.charCodeAt(i);
        i++;
    }
    HEAPU8[(((ptr+i)|0))]=0;//terminating null
}


var Module = {};

Module["preRun"]=[];

Module['preRun'].push(function(){

    	_gethostbyname = _gehostbyname_r = function(){ return 0; }
        _fcntl=function(){return -1;}
        _ioctl=function(){return -1;}
        
        //enet API functions from unix.c
        _enet_socket_create =function(){
            //console.log("enet_socket_create()",arguments);
            var sfd;
            try{
                udp_sockets_count++;
                sfd = udp_sockets_count;
                udp_sockets[sfd]=DGRAM.createSocket("udp4",function(msg,rinfo){
                    global_udp_callback(msg,rinfo,sfd);
                });
                udp_sockets[sfd].packets = new Queue();

            }catch(e){
                sfd=-1;
            }            
            return sfd;
        };
        
        _enet_socket_bind = function($socket,$address){
          var $host;
          var $port;
          $host = HEAPU32[(($address)>>2)];
          $port = HEAP16[(($address+4)>>1)];

          if(udp_sockets[$socket]){
              console.error("binding to port",$port);
              udp_sockets[$socket].bind($port,long2ip($host,'_enet_socket_bind'));
              return 0;
          }
          return -1;//todo: set error number
        };
        
        _enet_socket_listen = function($socket, $backlog){
          //console.error("enet_socket_listen()",arguments);
        };        
        _enet_socket_set_option = function(){
            //console.log("enet_socket_set_option()",arguments);
            return 0;
        };
        
        _recvmsg = function($sockfd, $msgHdr, $flags) {
          var udpsocket = udp_sockets[$sockfd];
          if(!udpsocket) return -1;
          if(!udpsocket.packets.getLength()) return 0;
          //dequeue
          var packet = udpsocket.packets.dequeue();
          if(!packet) return 0;

          var $sin=HEAP32[(($msgHdr)>>2)];
          var $buffer=HEAP32[(($msgHdr+8)>>2)];
          HEAP32[(($buffer+4)>>2)]=packet.dataLength;//dataLength
          var $data=HEAP32[($buffer)>>2];

          //Copy Node Buffer packet.data into HEAP8[($data)|0],HEAP8[($data+1)|0]
          //MAX_MTU?
          for(var i=0;i<packet.dataLength;i++){
            HEAPU8[($data+i)|0]=packet.data[i];
          }

          HEAP16[(($sin)>>1)]=1;
          HEAPU32[(($sin+4)>>2)]=ip2long(packet.ip);
          HEAP16[(($sin+2)>>1)]=_htons(packet.port);

          return packet.dataLength;//truncation??
        };
        
        _sendmsg = function($sockfd, $msgHdr, $flags) {
          var udpsocket = udp_sockets[$sockfd];
          if(!udpsocket) return -1;
          var chunks = [];
          var chunk;
          var chunkLength;
          var $sin=HEAP32[(($msgHdr)>>2)];
          var $buffers=HEAP32[(($msgHdr+8)>>2)];

          for( var $x=0; $x <  HEAPU32[($msgHdr+12)>>2] ; $x++ ){
              chunkLength = HEAP32[(($buffers+($x<<3)+4)>>2)];
              chunk = new Buffer(chunkLength);
              $data=HEAP32[($buffers+($x<<3))>>2]

              //Copy HEAP into node Buffer
              for(var i=0;i<chunkLength;i++){
                chunk[i] = HEAP8[($data+i)|0];
              }
              chunks.push(chunk);
           }

              HEAP16[(($sin)>>1)]=1;
              var packet = {};
              packet.ip = long2ip(HEAPU32[(($sin+4)>>2)],'_sendmsg');
              packet.port=_ntohs(HEAP16[(($sin+2)>>1)]);
              packet.data = BufferConcat(chunks);
              packet.dataLength = packet.data.length;
              udpsocket.send(packet.data,0,packet.data.length,packet.port,packet.ip,function(){
                 //console.log("Sent Packet:",packet);
              });
                  
              return packet.data.length;
        };

        _enet_socket_wait = function(){
            //console.error("enet_socket_wait()",arguments);
            return -1;//don't wait
        };
        _enet_socket_destroy = function($socket){
            //console.log("enet_socket_destroy()",arguments);
            if(udp_sockets[$socket]){
                udp_sockets[$socket].close();
                delete udp_sockets[$socket];
            }
        };

});//preRun


function __packet_filter (host_ptr){
   var ip,port,data;
   return global_packet_filter(ip,port,data);
}

