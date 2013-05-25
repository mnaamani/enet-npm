var Buffer = require("buffer").Buffer;

events = require("events");
util = require("util");
dgram = require("dgram");
Stream = require("stream");

var jsapi_ = {};
var enet_ = {};

var ENetSocketsBackend = (function(){
  var backend = {};
  var sockets_count = 0;
  var sockets = {};

  backend.packetFilter = (function(){
    var filterFunc;
    return({
      set: function(func){
        filterFunc = func;
      },
      apply: function(address,port){
        return filterFunc(address,port);
      }
    });
  })();

  function udpCallback(msg,rinfo,sfd){
    //que each packet it will be de-queed when recvmsg() is called
    var udpsocket = sockets[sfd];
    if(udpsocket){
      udpsocket.packets.enqueue({
          data:msg,
          dataLength:msg.length,
          ip:rinfo.address,
          port:rinfo.port
      });
    }
  }

  function nextFD(){
    sockets_count++;
    return sockets_count;
  }

  backend.getSocket = function($fd){
    return sockets[$fd];
  };

  backend.newSocket = function(){
    var sfd;
    try{
        sfd = nextFD();
        sockets[sfd]=dgram.createSocket("udp4",function(msg,rinfo){
            udpCallback(msg,rinfo,sfd);
        });
        sockets[sfd].packets = new Queue();
    }catch(e){
        sfd=-1;
    }            
    return sfd;
  };

  backend.bindSocket = function($socket,$address){
          var $host=0;
          var $port=0;
          if($address){
              $host = HEAPU32[(($address)>>2)];
              $port = HEAPU16[(($address+4)>>1)];
          }
          if(sockets[$socket]){
              //console.error("binding to",long2ip($host),$port);
              sockets[$socket].bind($port,long2ip($host));
              return 0;
          }
          return -1;//todo: set error number
  };

  function get_sockaddr_in($sin){
      return ({
          "family": HEAP32[($sin+0)>>1],
          "port":   HEAPU16[($sin+4)>>1],
          "addr":   HEAPU32[($sin+8)>>2]
      });
  }
  
  function set_sockaddr_in($sin,family,port,address){
      HEAP32[($sin+0)>>1] = family;
      HEAP16[($sin+4)>>1] = port;
      HEAPU32[($sin+8)>>2] = address;
  }

  backend.recvMsg = function($sockfd, $msgHdr, $flags){
          var udpsocket = sockets[$sockfd];
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
            HEAPU8[($data+i)|0]=packet.data.readUInt8(i);
          }
          set_sockaddr_in($sin,1,_htons(packet.port),ip2long(packet.ip));
          return packet.dataLength;//truncation??

  };

  backend.sendMsg = function($sockfd, $msgHdr, $flags){
          var udpsocket = sockets[$sockfd];
          if(!udpsocket) return -1;
          var chunks = [];
          var chunk;
          var chunkLength;
          var $sin=HEAP32[(($msgHdr)>>2)];
          var $buffers=HEAP32[(($msgHdr+8)>>2)];
          var $bufferCount=HEAPU32[($msgHdr+12)>>2];
          var packet = {};
          var addr = get_sockaddr_in($sin);

          for( var $x=0; $x < $bufferCount ; $x++ ){
              chunkLength = HEAP32[(($buffers+($x<<3)+4)>>2)];
              chunk = new Buffer(chunkLength);
              $data=HEAP32[($buffers+($x<<3))>>2]
              if(!chunkLength) continue;
              //Copy HEAP into node Buffer
              for(var i=0;i<chunkLength;i++){
                chunk.writeUInt8(HEAPU8[($data+i)|0],i);
              }
              chunks.push(chunk);
           }

           //HEAP16[(($sin)>>1)]  //AF_INET == 1
           packet.ip = long2ip(addr.addr);
           packet.port=_ntohs(addr.port);
           packet.data = BufferConcat(chunks);
           packet.dataLength = packet.data.length;
           udpsocket.send(packet.data,0,packet.data.length,packet.port,packet.ip,function(){
              //console.log("Sent Packet:",packet);
           });
                  
           return packet.data.length;
  };

  backend.destroySocket = function($socket){
      if(sockets[$socket]){
          sockets[$socket].close();
          delete sockets[$socket];
      }
  };

  // http://natesbox.com/blog/ip-cidr-conversion/
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

  backend.ip2long = ip2long;
  backend.long2ip = long2ip;

  function BufferConcat( buffers ){
    var totalLength = 0;
    buffers.forEach(function(B){
        if(!B || !B.length) return;
        totalLength = totalLength + B.length;
    });
    if(!totalLength) return [];

    var buf = new Buffer(totalLength);
    var i = 0;
    buffers.forEach(function(B){
        for(var b=0; b<B.length;b++){
            buf.writeUInt8(B.readUInt8(b),i);
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

  return backend;

}).call(this);

var Module = {};

Module["preRun"]=[];

Module['preRun'].push(function(){
        var backend = ENetSocketsBackend;
              
        Module["jsapi"]={};
        Module["jsapi"]["enet_host_create_client"] = jsapi_.enet_host_create_client = cwrap('jsapi_enet_host_create_client', 'number',
            ['number','number','number','number']);
        Module["jsapi"]["enet_host_create"] = jsapi_.enet_host_create = cwrap('jsapi_enet_host_create', 'number',
            ['number','number','number','number','number','number']);
        Module["jsapi"]["host_get_socket"] = jsapi_.host_get_socket = cwrap('jsapi_host_get_socket',"number",['number']);
        Module["jsapi"]["host_get_receivedAddress"] = jsapi_.host_get_receivedAddress = cwrap("jsapi_host_get_receivedAddress",'number',['number']);
        Module["jsapi"]["enet_host_connect"] = jsapi_.enet_host_connect = cwrap("jsapi_enet_host_connect","number",['number','number','number','number','number']);
        Module["jsapi"]["packet_get_data"] = jsapi_.packet_get_data = cwrap("jsapi_packet_get_data","number",["number"]);
        Module["jsapi"]["packet_set_free_callback"] = jsapi_.packet_set_free_callback = cwrap("jsapi_packet_set_free_callback","",["number","number"]);
        Module["jsapi"]["packet_get_dataLength"] = jsapi_.packet_get_dataLength = cwrap("jsapi_packet_get_dataLength","number",["number"]);
        Module["jsapi"]["event_new"] = jsapi_.event_new = cwrap('jsapi_event_new','number');
        Module["jsapi"]["event_free"] = jsapi_.event_free = cwrap('jsapi_event_free','',['number']);
        Module["jsapi"]["event_get_type"] = jsapi_.event_get_type = cwrap('jsapi_event_get_type','number',['number']);
        Module["jsapi"]["event_get_peer"] = jsapi_.event_get_peer = cwrap('jsapi_event_get_peer','number',['number']);
        Module["jsapi"]["event_get_packet"] = jsapi_.event_get_packet = cwrap('jsapi_event_get_packet','number',['number']);
        Module["jsapi"]["event_get_data"] = jsapi_.event_get_data = cwrap('jsapi_event_get_data','number',['number']);
        Module["jsapi"]["event_get_channelID"] = jsapi_.event_get_channelID = cwrap('jsapi_event_get_channelID','number',['number']);
        Module["jsapi"]["address_get_host"] = jsapi_.address_get_host = cwrap('jsapi_address_get_host','number',['number']);
        Module["jsapi"]["address_get_port"] = jsapi_.address_get_port = cwrap('jsapi_address_get_port','number',['number']);
        Module["jsapi"]["peer_get_address"] = jsapi_.peer_get_address = cwrap('jsapi_peer_get_address','number',['number']);

        Module["libenet"] = {};
        Module["libenet"]["host_destroy"] = enet_.host_destroy = cwrap("enet_host_destroy",'',['number']);
        Module["libenet"]["host_flush"] = enet_.host_flush = cwrap('enet_host_flush',"",['number']);	    
        Module["libenet"]["packet_create"] = enet_.packet_create = cwrap("enet_packet_create","number",['number','number','number']);
        Module["libenet"]["packet_destroy"] = enet_.packet_destroy = cwrap("enet_packet_destroy",'',['number']);
        Module["libenet"]["peer_send"] = enet_.peer_send = cwrap('enet_peer_send','number',['number','number','number']);
        Module["libenet"]["peer_reset"] = enet_.peer_reset = cwrap('enet_peer_reset','',['number']);
        Module["libenet"]["peer_ping"] = enet_.peer_ping = cwrap('enet_peer_ping','',['number']);
        Module["libenet"]["peer_disconnect"] = enet_.peer_disconnect = cwrap('enet_peer_disconnect','',['number','number']);
        Module["libenet"]["peer_disconnect_now"] = enet_.peer_disconnect_now = cwrap('enet_peer_disconnect_now','',['number','number']);
        Module["libenet"]["peer_disconnect_later"] = enet_.peer_disconnect_later = cwrap('enet_peer_disconnect_later','',['number','number']);

        //override system lib functions
    	_gethostbyname = _gehostbyname_r = function(){ return 0; }
        _fcntl=function(){return -1;}
        _ioctl=function(){return -1;}
        _ntohs = _htons;
        _ntohl = _htonl;
        _recvmsg = backend.recvMsg;
        _sendmsg = backend.sendMsg;

        //override enet API functions from unix.c
        _enet_socket_create = backend.newSocket;
        _enet_socket_bind = backend.bindSocket;
        _enet_socket_listen = function($socket, $backlog){};
        _enet_socket_set_option = function(){
            return 0;
        };
        _enet_socket_wait = function(){
            return -1;//don't wait
        };
        _enet_socket_destroy = backend.destroySocket;

        __packet_filter = function(host_ptr){
           var addr = new ENetAddress(jsapi_.host_get_receivedAddress(host_ptr));
           return backend.packetFilter.apply(addr.address(),addr.port());
        }
});
