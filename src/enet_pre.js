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
        _ntohs = _htons;
        _ntohl = _htonl;
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

