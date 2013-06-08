/* If compiling with -O2 or --closure  make sure to include -s LINKABLE=1 */

var node_sockets = {
    $ENetSockets__postset:""+ 
        "_gethostbyname = _gehostbyname_r = function(){ return 0; };"+
        "_fcntl=function(){return -1;};"+
        "_ioctl=function(){return -1;};"+
        "_ntohs = _htons;"+
        "_ntohl = _htonl;"+
        "_recvmsg = ENetSockets.recvMsg;"+
        "_sendmsg = ENetSockets.sendMsg;"+
        "_enet_socket_create = ENetSockets.create;"+
        "_enet_socket_bind = ENetSockets.bind;"+
        "_enet_socket_listen = function($socket, $backlog){};"+
        "_enet_socket_set_option = function(){return 0;};"+
        "_enet_socket_wait = function(){return -1;};"+
        "_enet_socket_destroy = ENetSockets.destroy;",

    $ENetSockets__deps: ['__setErrNo', '$ERRNO_CODES'],
    $ENetSockets: {
        sockets: {},
        nextFd: 1,
        sockaddr_in_layout: Runtime.generateStructInfo([
          ['i32', 'sin_family'],
          ['i16', 'sin_port'],
          ['i32', 'sin_addr'],
          ['i32', 'sin_zero'],
          ['i16', 'sin_zero_b'],
        ]),
        msghdr_layout: Runtime.generateStructInfo([
          ['*', 'msg_name'],
          ['i32', 'msg_namelen'],
          ['*', 'msg_iov'],
          ['i32', 'msg_iovlen'],
          ['*', 'msg_control'],
          ['i32', 'msg_controllen'],
          ['i32', 'msg_flags'],
        ]),
        ENetAddress_layout: Runtime.generateStructInfo([
            ['i32','host'],
            ['i16','port']
        ]),
        getSocket:function(fd){
            return ENetSockets.sockets[fd];
        },
        create:function(){
            var fd;
            var socket;
            try{
                fd = ENetSockets.nextFd++;
                socket = ENetSockets.sockets[fd]=require('dgram').createSocket("udp4",function(msg,rinfo){
                    //que each packet it will be de-queed when recvmsg() is called
                    socket.packets.push({
                          data:msg,
                          dataLength:msg.length,
                          ip:rinfo.address,
                          port:rinfo.port
                    });
                });
                socket.packets = [];
                return fd;
            }catch(e){
                return -1;
            }            
        },
        bind:function($socket,$address){
          var host=0;
          var port=0;
          if($address){
              host = {{{ makeGetValue('$address', 'ENetSockets.ENetAddress_layout.host', 'i32') }}};
              port = {{{ makeGetValue('$address', 'ENetSockets.ENetAddress_layout.port', 'i16') }}};
          }
          if(ENetSockets.sockets[$socket]){
              try{
                ENetSockets.sockets[$socket].bind(port,ENetSockets.long2ip(host));
                return 0;
              }catch(E){
                return -1;
              }
          }else{
              ___setErrNo(ERRNO_CODES.EBADF);
          }
          return -1;
        },
        get_sockaddr_in:function($sin){
          return ({
              "family": {{{ makeGetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_family', 'i32') }}},
              "port": {{{ makeGetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_port', 'i16') }}},
              "addr": {{{ makeGetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_addr', 'i32') }}}
          });
        },
        set_sockaddr_in:function($sin,family,port,address){
          {{{ makeSetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_family', 'family', 'i32') }}};
          {{{ makeSetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_port', 'port', 'i16') }}};
          {{{ makeSetValue('$sin', 'ENetSockets.sockaddr_in_layout.sin_addr', 'address', 'i32') }}};
        },
          /*
           * http://pubs.opengroup.org/onlinepubs/009695399/functions/recvmsg.html
           */
         recvMsg: function($sockfd, $msgHdr, $flags){
          var udpsocket = ENetSockets.sockets[$sockfd];
          if(!udpsocket) {
             ___setErrNo(ERRNO_CODES.EBADF);
             return -1;
          }
          if(!udpsocket.packets.length){
             ___setErrNo(ERRNO_CODES.EAGAIN);
             return -1;
          }
          var packet = udpsocket.packets.shift();
          if(!packet){
            ___setErrNo(ERRNO_CODES.EAGAIN);
            return -1;
          }
          var $sin = {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_name', '*') }}};
          var $buffer= {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_iov', '*') }}};
          var $buffer_size = HEAP32[(($buffer+4)>>2)];
          var $num = {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_iovlen', 'i32') }}};//==1 enet only uses one buffer
          HEAP32[(($buffer+4)>>2)]=packet.dataLength;
          var $data=getValue($buffer,'i32');

          for(var i=0;i<packet.dataLength && i<$buffer_size;i++){
            HEAPU8[($data+i)|0]=packet.data.readUInt8(i);
          }
          ENetSockets.set_sockaddr_in($sin,1,_htons(packet.port),ENetSockets.ip2long(packet.ip));
          if(packet.dataLength > $buffer_size){
            //MSG_TRUNC shall be set in the msg_flags member of the msghdr structure
            {{{ makeSetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_flags', '0x20', 'i32') }}};
          }
          return packet.dataLength;
        },
        sendMsg:function($sockfd, $msgHdr, $flags){
          var udpsocket = ENetSockets.sockets[$sockfd];
          if(!udpsocket) {
             ___setErrNo(ERRNO_CODES.EBADF);
             return -1;
          }
          var chunks = [];
          var chunk;
          var chunkLength;
          var $sin = {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_name', '*') }}};
          var $buffers= {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_iov', '*') }}};
          var $bufferCount = {{{ makeGetValue('$msgHdr', 'ENetSockets.msghdr_layout.msg_iovlen', 'i32') }}};
          var packet = {};
          var addr = ENetSockets.get_sockaddr_in($sin);
          var $data,$x,i;
          for($x=0; $x < $bufferCount ; $x++ ){
              chunkLength = HEAP32[(($buffers+($x<<3)+4)>>2)];
              chunk = new Buffer(chunkLength);
              $data=HEAP32[($buffers+($x<<3))>>2]
              if(!chunkLength) continue;
              //Copy HEAP into node Buffer
              for(i=0;i<chunkLength;i++){
                chunk.writeUInt8(HEAPU8[($data+i)|0],i);
              }
              chunks.push(chunk);
           }

           //HEAP16[(($sin)>>1)]  //AF_INET == 1
           packet.ip = ENetSockets.long2ip(addr.addr);
           packet.port=_ntohs(addr.port);
           packet.data = ENetSockets.bufferConcat(chunks);
           packet.dataLength = packet.data.length;
           try{
                udpsocket.send(packet.data,0,packet.data.length,packet.port,packet.ip);
           }
           catch(E){
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
           }
           return packet.data.length;
        },
        destroy:function($socket){
          if(ENetSockets.sockets[$socket]){
              ENetSockets.sockets[$socket].close();
              delete ENetSockets.sockets[$socket];
          }
        },
        long2ip:function long2ip(addr) {
            return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff);
        },
        ip2long:function(ipstr) {
            var b = ipstr.split('.');
            return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
        },
        bufferConcat:function( buffers ){
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

    },

    init_enet_sockets_backend__deps: ['$ENetSockets'],
    init_enet_sockets_backend:function(){
    }
};

mergeInto(LibraryManager.library, node_sockets);
