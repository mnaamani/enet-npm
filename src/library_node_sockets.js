  // ==========================================================================
  // sockets. Note that the implementation assumes all sockets are always
  // nonblocking
  // ==========================================================================
mergeInto(LibraryManager.library, {
  $NodeSockets__postset: 'Module["getStreamSocket"]=NodeSockets.getStreamSocket;'+
                         'Module["createStreamFromSocket"]=NodeSockets.createStreamFromSocket;',
  $NodeSockets__deps: ['__setErrNo', '$ERRNO_CODES'],
  $NodeSockets: {
    getStreamSocket: function(fd){
    	var stream = FS.getStream(fd);
	return stream ? stream.socket : undefined;
    },
    createStreamFromSocket: function(socket){
      var stream = FS.createStream({
	addrlen: {{{ C_STRUCTS.sockaddr_in.__size__ }}},
	connected: false,
	stream: false,
	dgram: true,
	socket: socket,
	bound: false,
	inQueue: []
      });
      stream.skipBind = true;
      return stream.fd;
    },
    inet_aton_raw: function(str) {
        var b = str.split(".");
        return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
    },
    inet_ntoa_raw: function(addr) {
        return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
    },
    DGRAM:function(){
#if CHROME_SOCKETS
        if((typeof window !== 'undefined') && window["chrome"] && window["chrome"]["socket"]) return NodeSockets.ChromeDgram();
#endif
        if(typeof require !== 'undefined') return require("dgram");//node or browserified
        assert(false,"no dgram sockets backend found!");
    },
    NET:function(){
#if CHROME_SOCKETS
        if((typeof window !== 'undefined') && window["chrome"] && window["chrome"]["socket"]) return NodeSockets.ChromeNet();
#endif
        if(typeof require !== 'undefined') return require("net");//node or browserified
        assert(false, "no tcp socket backend found!");
    },
    buffer2uint8array: function(buffer){
      var arraybuffer = new ArrayBuffer(buffer.length);
      var uint8Array = new Uint8Array(arraybuffer);
      for(var i = 0; i < buffer.length; i++) {
        uint8Array[i] = buffer["readUInt8"](i);//cannot index Buffer with [] if browserified..
      }
      return uint8Array;
    },
#if CHROME_SOCKETS
    ChromeNet: undefined,       /* use https://github.com/GoogleChrome/net-chromeify.git ? (Apache license)*/
    ChromeDgram: function(){
        /*
         *  node dgram API from chrome.socket API - using Uint8Array() instead of Buffer()
         *  Copyright (C) 2013 Mokhtar Naamani
         *  license: MIT
         */
        var exports = {};

        exports["createSocket"] = function (type, message_event_callback){
            assert( type === 'udp4', "only supporting udp4 sockets in chrome");
            return new UDPSocket(message_event_callback);
        }

        function UDPSocket(msg_evt_cb){
            var self = this;
            self._is_chrome_socket = true;
            self._event_listeners = {};

            self["on"]("listening",function(){
                //send pending datagrams..
                self.__pending.forEach(function(job){
                    job.socket_id = self.__socket_id;
                    send_datagram(job);            
                });
                delete self.__pending;
                //start polling socket for incoming datagrams
                self.__poll_interval = setInterval(do_recv,30);
#if SOCKET_DEBUG
                console.log("chrome socket bound to:",JSON.stringify(self.address()));
#endif
            });

            if(msg_evt_cb) self["on"]("message",msg_evt_cb);

            function do_recv(){
                if(!self.__socket_id) return;
                window["chrome"]["socket"]["recvFrom"](self.__socket_id, undefined, function(info){
                    var buff;
                    //todo - set correct address family
                    //todo - error detection.
                    if(info["resultCode"] > 0){
                        buff = new Uint8Array(info["data"]);
                        self["emit"]("message",buff,{"address":info["address"],"port":info["port"],"size":info["data"]["byteLength"],"family":"IPv4"});
                    }
                });
            }
            self.__pending = [];//queued datagrams to send (if app tried to send before socket is ready)
        }

        UDPSocket.prototype["on"] = function(evt,callback){
            //used to register callbacks
            //store event name e in this._events 
            this._event_listeners[evt] ? this._event_listeners[evt].push(callback) : this._event_listeners[evt]=[callback];
        };

        UDPSocket.prototype["emit"] = function(e){
            //used internally to fire events
            //'apply' event handler function  to 'this' channel pass eventname 'e' and arguemnts.slice(1)
            var self = this;
            var args = Array.prototype.slice.call(arguments);

            if(this._event_listeners && this._event_listeners[e]){
                this._event_listeners[e].forEach(function(cb){
                    cb.apply(self,args.length>1?args.slice(1):[undefined]);
                });
            }
        };

        UDPSocket.prototype["close"] = function(){
            //Close the underlying socket and stop listening for data on it.
            if(!self.__socket_id) return;
            window["chrome"]["socket"]["destroy"](self.__socket_id);
            clearInterval(self.__poll_interval);
            delete self.__poll_interval;
        };

        UDPSocket.prototype["bind"] = function(port,address){
            var self = this;
            address = address || "0.0.0.0";
            port = port || 0;
            if(self.__socket_id || self.__bound ) return;//only bind once!
            self.__bound = true;
            window["chrome"]["socket"]["create"]('udp',{},function(socketInfo){
                self.__socket_id = socketInfo["socketId"];
                window["chrome"]["socket"]["bind"](self.__socket_id,address,port,function(result){
                    window["chrome"]["socket"]["getInfo"](self.__socket_id,function(info){
                      self.__local_address = info["localAddress"];
                      self.__local_port = info["localPort"];
                      self["emit"]("listening");
                    });
                });
            });
        };

        UDPSocket.prototype["address"] = function(){
            return({"address":this.__local_address,"port":this.__local_port});
        };

        UDPSocket.prototype["setBroadcast"] = function(flag){
            //do chrome udp sockets support broadcast?
#if SOCKET_DEBUG
            console.log("setting broadcast on chrome socket to:",flag);
#endif
        };

        UDPSocket.prototype["send"] = function(buff, offset, length, port, address, callback){
            var self = this;
            var job = {
                    socket_id:self.__socket_id,
                    buff:buff,
                    offset:offset,
                    length:length,
                    port:port,
                    address:address,
                    callback:callback
            };
            if(!self.__socket_id){
                 if(!self.__bound) self.bind();
                 self.__pending.push(job);
            }else{
                send_datagram(job);
            }

        };

        function send_datagram(job){
            var data;
            var buff;
            var i;
            if(job.offset == 0 && job.length == job.buff.length){ 
                buff = job.buff;
            }else{
                buff = job.buff.subarray(job.offset,job.offset+job.length);
            }
            data = buff.buffer;
            window["chrome"]["socket"]["sendTo"](job.socket_id,data,job.address,job.port,function(result){
                var err;
                if(result["bytesWritten"] < data.byteLength ) err = 'truncation-error';
                if(result["bytesWritten"] < 0 ) err = 'send-error';
                if(job.callback) job.callback(err,result["bytesWritten"]);
            });
        }

         return exports;

        },
#endif
   },
   close__deps: ['$FS', '__setErrNo', '$ERRNO_CODES'],
   close: function(fildes) {
     // int close(int fildes);
     // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
     var stream = FS.getStream(fildes);
     if(stream) {
       if(stream.socket){
         if(stream.interval) clearInterval(stream.interval);
         if(typeof stream.socket["close"] == "function"){
             if(stream._dgram_on_message) stream.socket["removeListener"]("message",stream._dgram_on_message);
             if(!stream.skipBind) stream.socket["close"]();//udp sockets, tcp listening sockets
         }
         if(typeof stream.socket["end"] == "function") stream.socket["end"]();//tcp connections
         FS.closeStream(stream.fd);
         return 0;
       } else {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e; // why are we throwing it again?
        } finally {
          FS.closeStream(stream.fd);
        }
        return 0;
       }
     } else {
      ___setErrNo(ERRNO_CODES.EBADF);
      return -1;
     }
    },
    socket__deps: ['$NodeSockets', '__setErrNo', '$ERRNO_CODES'],
    socket: function(family, type, protocol) {
        var fd;
        if(!(family == {{{ cDefine('AF_INET') }}} || family == {{{ cDefine('AF_INET6') }}}))
        {
            ___setErrNo(ERRNO_CODES.EAFNOSUPPORT);
            return -1;
        }
        var v6 = (family == {{{ cDefine('AF_INET6')}}})

        var stream = type === {{{ cDefine('SOCK_STREAM') }}};
        var dgram = type === {{{ cDefine('SOCK_DGRAM') }}};

        if (protocol) {
          assert(stream == (protocol == {{{ cDefine('IPPROTO_TCP') }}})); // if stream, must be tcp
          assert(dgram  == (protocol == {{{ cDefine('IPPROTO_UDP') }}})); // if dgram, must be udp
        }

        try{
         if(stream){
          fd = FS.createStream({
            addrlen : v6 ? {{{ C_STRUCTS.sockaddr_in6.__size__ }}} : {{{ C_STRUCTS.sockaddr_in.__size__ }}} ,
            connected: false,
            stream: true,
            socket: true, //real socket will be created when bind() or connect() is called 
                          //to choose between server and connection sockets
            inQueue: []
          }).fd;
         }else if(dgram){
          fd = FS.createStream({
            addrlen : v6 ? {{{ C_STRUCTS.sockaddr_in6.__size__ }}} : {{{ C_STRUCTS.sockaddr_in.__size__ }}} ,
            connected: false,
            stream: false,
            dgram: true,
            socket: NodeSockets.DGRAM()["createSocket"](v6?'udp6':'udp4'),
            bound: false,
            inQueue: []
          }).fd;
         }else{
            ___setErrNo(ERRNO_CODES.EPROTOTYPE);
            return -1;
         }
#if SOCKET_DEBUG
        console.log("created socket fd:",fd);
#endif
         return fd;
        }catch(e){
            ___setErrNo(ERRNO_CODES.EACCES);
#if SOCKET_DEBUG
            console.log(e);
#end if
            return -1;
        }
    },
   /*
    *   http://pubs.opengroup.org/onlinepubs/009695399/functions/connect.html
    */
    connect__deps: ['$NodeSockets', 'htons', '__setErrNo', '$ERRNO_CODES','inet_ntop6_raw'],
    connect: function(fd, addr, addrlen) {
        if(typeof fd == 'number' && (fd > 64 || fd < 1) ){
            ___setErrNo(ERRNO_CODES.EBADF); return -1;
        }
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }

        if(info.dgram && !info.bound) _bind(fd);

        if(info.stream && info.CONNECTING){
            ___setErrNo(ERRNO_CODES.EALREADY); return -1;
        }
        if(info.stream && info.ESTABLISHED){
            ___setErrNo(ERRNO_CODES.EISCONN); return -1;
        }
        if(info.stream && info.CLOSED){
            //only do a successful connect once per socket
            ___setErrNo(ERRNO_CODES.ECONNRESET); return -1;
        }
        if(info.stream && info.socket.server){
            //listening tcp socket cannot connect
            ___setErrNo(ERRNO_CODES.EOPNOTSUPP); return -1;
        }

        info.connected = true;

        assert( info.addrlen === addrlen );
        switch(addrlen){
            case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                info.addr = {{{ makeGetValue('addr', C_STRUCTS.sockaddr_in.sin_addr.s_addr, 'i32') }}};
                info.port = _htons( {{{ makeGetValue('addr', C_STRUCTS.sockaddr_in.sin_port, 'i16') }}});
                info.host = NodeSockets.inet_ntoa_raw(info.addr);
                break;
            case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                info.port = _htons( {{{ makeGetValue('addr', C_STRUCTS.sockaddr_in6.sin6_port, 'i16')}}} );
                info.host = _inet_ntop6_raw(addr + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}} );
                break;
        }
        if(!info.stream) return 0;
        (function(info){
            var intervalling = false, interval;
            var outQueue = [];
            info.hasData = function() { return info.inQueue.length > 0 }
            info.CONNECTING = true;

            function onEnded(){
                info.ESTABLISHED = false;
                info.CLOSED = true;
            }
            info.sender = function(buf){
                outQueue.push(buf);
                trySend();
            };

            function send(data) {
                var buff = new Buffer(data);
                if(!info.socket["write"](buff)) info.paused = true;
            }
            function trySend() {
                if (!info.ESTABLISHED) {
                  if (!intervalling) {
                    intervalling = true;
                    info.interval = setInterval(trySend, 100);
                  }
                  return;
                }
                for (var i = 0; i < outQueue.length; i++) {
                   send(outQueue[i]);
                }
                outQueue.length = 0;
                if (intervalling) {
                    intervalling = false;
                    if(info.interval) clearInterval(info.interval);
                }
            }

            try{
              info.socket = new NodeSockets.NET()["connect"]({host:info.host,port:info.port,localAddress:info.local_host},function(){
                info.CONNECTING = false;
                info.ESTABLISHED = true;
              });
            }catch(e){
                return -1;
            }

            info.socket["on"]('drain',function(){
               info.paused = false;
            });

            info.socket["on"]('data',function(buf){
                info.inQueue.push(new Uint8Array(buf));
            });

            info.socket["on"]('close',onEnded);
            info.socket["on"]('error',onEnded);
            info.socket["on"]('end',onEnded);
            info.socket["on"]('timeout',function(){
                info.socket["end"]();
                onEnded();
            });
        })(info);
        //for tcp we always return and do an async connect irrespective of socket option O_NONBLOCK
        ___setErrNo(ERRNO_CODES.EINPROGRESS); return -1;
    },
    recv__deps: ['$NodeSockets','recvfrom'],
    recv: function(fd, buf, len, flags) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        return _recvfrom(fd,buf,len,flags,0,0);
    },
    send__deps: ['$NodeSockets'],
    send: function(fd, buf, len, flags) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        if(info.dgram && !info.bound) _bind(fd);
        info.sender(HEAPU8.subarray(buf, buf+len));
        return len;
    },
    sendmsg__deps: ['$NodeSockets', 'connect','inet_ntop6_raw'],
    sendmsg: function(fd, msg, flags) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }

        // if we are not connected, use the address info in the message
        var name = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_name, '*') }}};
        var namelen = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_namelen, 'i32') }}};
        if (!info.connected) {
          assert(name, 'sendmsg on non-connected socket, and no name/address in the message');
          if(info.stream) _connect(fd, name, namelen);
        }
        var iov = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_iov, 'i8*') }}};
        var num = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_iovlen, 'i32') }}};
#if SOCKET_DEBUG
          Module.print('sendmsg vecs: ' + num);
#endif
        var totalSize = 0;
        for (var i = 0; i < num; i++) {
          totalSize += {{{ makeGetValue('iov', '8*i + 4', 'i32') }}};
        }
        var buffer = new Uint8Array(totalSize);
        var ret = 0;
        for (var i = 0; i < num; i++) {
          var currNum = {{{ makeGetValue('iov', '8*i + 4', 'i32') }}};
#if SOCKET_DEBUG
         Module.print('sendmsg curr size: ' + currNum);
#endif
          if (!currNum) continue;
          var currBuf = {{{ makeGetValue('iov', '8*i', 'i8*') }}};
          buffer.set(HEAPU8.subarray(currBuf, currBuf+currNum), ret);
          ret += currNum;
        }
        assert( info.addrlen === namelen );
        var addr,port,host;
        switch(namelen){
            case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                addr = getValue(name + {{{ C_STRUCTS.sockaddr_in.sin_addr.s_addr }}}, 'i32');
                port = _htons(getValue(name + {{{ C_STRUCTS.sockaddr_in.sin_port }}}, 'i16'));
                host = NodeSockets.inet_ntoa_raw(addr);
                break;
            case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                port = _htons( {{{ makeGetValue('name', C_STRUCTS.sockaddr_in6.sin6_port, 'i16') }}});
                host = _inet_ntop6_raw(name + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}});
                break;
        }
        if(info.dgram && !info.bound) _bind(fd);
        info.sender(buffer,host,port); // send all the iovs as a single message
        return ret;
    },
    recvmsg__deps: ['$NodeSockets', 'connect', 'recv', '__setErrNo', '$ERRNO_CODES', 'htons', 'inet_pton6_raw'],
    recvmsg: function(fd, msg, flags) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        if (!info.hasData()) {
          ___setErrNo(ERRNO_CODES.EWOULDBLOCK);
          return -1;
        }
        var buffer = info.inQueue.shift();
        var bytes = buffer.length;
#if SOCKET_DEBUG
        Module.print('recvmsg bytes: ' + bytes);
#endif
        var name = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_name, '*') }}};
        var namelen = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_namelen, 'i32') }}};
        assert( info.addrlen === namelen );
        // write source - assuming a dgram..
        switch(namelen){
            case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                if(info.connected){
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in.sin_addr.s_addr, 'info.addr', 'i32') }}};
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in.sin_port, '_htons(info.port)', 'i16') }}};
                }else{
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in.sin_addr.s_addr, 'NodeSockets.inet_aton_raw(buffer.from.host)', 'i32') }}};
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in.sin_port, '_htons(buffer.from.port)', 'i16') }}};
                }
                break;
            case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                if(info.connected){
                    _inet_pton6_raw(info.host,name + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}});
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in6.sin6_port, '_htons(info.port)', 'i16') }}};
                }else{
                    _inet_pton6_raw(buffer.from.host,name + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}});
                    {{{ makeSetValue('name', C_STRUCTS.sockaddr_in6.sin6_port, '_htons(buffer.from.port)', 'i16') }}};
                }
                break;
        }
        
        // write data
        var ret = bytes;
        var iov = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_iov, 'i8*') }}};
        var num = {{{ makeGetValue('msg', C_STRUCTS.msghdr.msg_iovlen, 'i32') }}};
        var bufferPos = 0;
        for (var i = 0; i < num && bytes > 0; i++) {
          var currNum = {{{ makeGetValue('iov', '8*i + 4', 'i32') }}};
#if SOCKET_DEBUG
          Module.print('recvmsg loop ' + [i, num, bytes, currNum]);
#endif
          if (!currNum) continue;
          currNum = Math.min(currNum, bytes); // XXX what should happen when we partially fill a buffer..?
          bytes -= currNum;
          var currBuf = {{{ makeGetValue('iov', '8*i', 'i8*') }}};
#if SOCKET_DEBUG
          Module.print('recvmsg call recv ' + currNum);
#endif
          HEAPU8.set(buffer.subarray(bufferPos, bufferPos + currNum), currBuf);
          bufferPos += currNum;
        }
        if (info.stream) {
          // This is tcp (reliable), so if not all was read, keep it
          if (bufferPos < bytes) {
            info.inQueue.unshift(buffer.subarray(bufferPos));
#if SOCKET_DEBUG
            Module.print('recvmsg: put back: ' + (bytes - bufferPos));
#endif
          }
        }
        return ret;
    },
    
    recvfrom__deps: ['$NodeSockets','inet_pton6_raw','__setErrNo', '$ERRNO_CODES'],
    recvfrom: function(fd, buf, len, flags, addr, addrlen) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        if (!info.hasData()) {
          //todo: should return 0 if info.stream && info.CLOSED ?
          ___setErrNo(ERRNO_CODES.EAGAIN); // no data, and all sockets are nonblocking, so this is the right behavior
          return -1;
        }
        var buffer = info.inQueue.shift();
        if(addr){
            assert( info.addrlen === addrlen );
            switch(addrlen){
                case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                    {{{ makeSetValue('addr', C_STRUCTS.sockaddr_in.sin_addr.s_addr, 'NodeSockets.inet_aton_raw(buffer.from.host)', 'i32') }}};
                    {{{ makeSetValue('addr', C_STRUCTS.sockaddr_in.sin_port, '_htons(buffer.from.port)', 'i16') }}};
                    break;
                case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                    _inet_pton6_raw(buffer.from.host,addr+ {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}});
                    {{{ makeSetValue('addr', C_STRUCTS.sockaddr_in6.sin6_port, '_htons(buffer.from.port)', 'i16') }}};
                    break;
            }
        }
#if SOCKET_DEBUG
        Module.print('recv: ' + [Array.prototype.slice.call(buffer)]);
#endif
        if (len < buffer.length) {
          if (info.stream) {
            // This is tcp (reliable), so if not all was read, keep it
            info.inQueue.unshift(buffer.subarray(len));
#if SOCKET_DEBUG
            Module.print('recv: put back: ' + (len - buffer.length));
#endif
          }
          buffer = buffer.subarray(0, len);
        }
        HEAPU8.set(buffer, buf);
        return buffer.length;
    },
    
    shutdown: function(fd, how) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        //todo: if how = 0 disable sending info.sender=function(){return -1;}
        //             = 1 disable receiving (delete info.inQueue?)
        if(info.interval) clearInterval(info.interval);
        if(info.socket && fd > 63){
            info.socket["close"] && info.socket["close"]();
            info.socket["end"] && info.socket["end"]();
        }
        if(info.socket) _close(fd);
        
        return 0;
    },
    
    ioctl: function(fd, request, varargs) {
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        var bytes = 0;
        if (info.hasData()) {
          bytes = info.inQueue[0].length;
        }
        var dest = {{{ makeGetValue('varargs', '0', 'i32') }}};
        {{{ makeSetValue('dest', '0', 'bytes', 'i32') }}};
        return 0;
    },
    
    setsockopt: function(d, level, optname, optval, optlen) {
#if SOCKET_DEBUG
        console.log('ignoring setsockopt command');
#endif
        return 0;
    },
    
    bind__deps: ['connect','inet_ntop6_raw'],
    bind: function(fd, addr, addrlen) {
        if(typeof fd == 'number' && (fd > 64 || fd < 1) ){
            ___setErrNo(ERRNO_CODES.EBADF); return -1;
        }
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        if(info.dgram && info.bound){
            ___setErrNo(ERRNO_CODES.EINVAL); return -1;
        }
        if(info.connected){
            ___setErrNo(ERRNO_CODES.EISCONN); return -1;
        }
        try{
          if(addr){
            assert(info.addrlen === addrlen);
            switch(addrlen){
                case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                    info.local_addr = {{{ makeGetValue('addr',C_STRUCTS.sockaddr_in.sin_addr.s_addr, 'i32') }}};
                    info.local_port = _htons( {{{ makeGetValue('addr', C_STRUCTS.sockaddr_in.sin_port, 'i16') }}} );
                    info.local_host = NodeSockets.inet_ntoa_raw(info.local_addr);
                    break;
                case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                    info.local_port = _htons( {{{makeGetValue('addr', C_STRUCTS.sockaddr_in6.sin6_port, 'i16') }}} );
                    info.local_host = _inet_ntop6_raw(addr + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}} );
                    break;
            }
          }

          if(info.stream){
            //we dont actually bind a tcp node socket yet only store the local address to to use
            //when  connect or listen are called.
            return 0;
          }

          if(info.dgram){
               info.bound = true;
               info.hasData = function(){return info.inQueue.length>0}
               if(!info.skipBind) info.socket["bind"](info.local_port||0,info.local_host||undefined);
	       info._dgram_on_message = function(msg,rinfo){
                    if(info.host && info.connected){
                        //connected dgram socket will only accept packets from info.host:info.port
                        if(info.host !== rinfo.address || info.port !== rinfo.port) return;
                    }
                    var buf;

                    if(info.socket._is_chrome_socket) {
                          buf = msg;
                    }else{
                          buf = msg instanceof ArrayBuffer ? new Uint8Array(msg) : NodeSockets.buffer2uint8array(msg);
                    }

                    buf.from= {
                        host: rinfo["address"],
                        port: rinfo["port"]
                    }
                    info.inQueue.push(buf);
               };
               info.socket["on"]('message',info._dgram_on_message);
               
               info.sender = function(buf,ip,port){
                    var buffer;
                    if(info.socket._is_chrome_socket) {
                         buffer = buf;
                    }else{
                         buffer = new Buffer(buf);
                    }
                    info.socket["send"](buffer,0,buffer.length,port,ip);
               }
          }
          
        }catch(e){
#if SOCKET_DEBUG
            console.log(e);
#endif
            return -1;
        }
        return 0;
    },
    
    listen: function(fd, backlog) {
        if(typeof fd == 'number' && (fd > 64 || fd < 1) ){
            ___setErrNo(ERRNO_CODES.EBADF); return -1;
        }
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        assert(info.stream);
        info.socket = NodeSockets.NET()["createServer"]();
        info.server = info.socket;//mark it as a listening socket
        info.connQueue = [];
        info.socket["listen"](info.local_port||0,info.local_host,backlog,function(){
#if SOCKET_DEBUG
            console.log('listening on',info.local_port||0,info.local_host);
#endif
        });
        info.socket["on"]("connection",function(socket){
             info.connQueue.push(socket);
        });
        return 0;
    },
    accept__deps: ['$NodeSockets','inet_pton6_raw','__setErrNo', '$ERRNO_CODES'],
    accept: function(fd, addr, addrlen) {
        if(typeof fd == 'number' && (fd > 64 || fd < 1) ){
            ___setErrNo(ERRNO_CODES.EBADF); return -1;
        }
        var info = FS.streams[fd];
        if (!info || !info.socket) {
            ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
        }
        
        if(!info.server){   //not a listening socket
            ___setErrNo(ERRNO_CODES.EINVAL); return -1;
        }
        if(info.connQueue.length == 0) {
            ___setErrNo(ERRNO_CODES.EAGAIN); return -1;
        }
        
        var newfd = FS.createStream({
            socket:false,   //newfd will be > 63
            inQueue:[]
        }).fd;

        if(newfd == -1){
            ___setErrNo(ERRNO_CODES.ENFILE); return -1;
        }

        var conn = FS.streams[newfd];
        conn.socket = info.connQueue.shift();
        
        conn.port = _htons(conn.socket["remotePort"]);
        conn.host = conn.socket["remoteAddress"];
                
        if (addr) {
            switch(info.addrlen){
                case {{{ C_STRUCTS.sockaddr_in.__size__ }}}:
                    setValue(addr + {{{ C_STRUCTS.sockaddr_in.sin_addr.s_addr }}}, NodeSockets.inet_aton_raw(conn.host), 'i32');
                    setValue(addr + {{{ C_STRUCTS.sockaddr_in.sin_port }}}, conn.port, 'i16');
                    setValue(addr + {{{ C_STRUCTS.sockaddr_in.sin_family }}}, {{{ cDefine('AF_INET') }}}, 'i16');
                    setValue(addrlen, {{{ C_STRUCTS.sockaddr_in.__size__ }}}, 'i32');
                    break;
                case {{{ C_STRUCTS.sockaddr_in6.__size__ }}}:
                    _inet_pton6_raw(conn.host,addr + {{{ C_STRUCTS.sockaddr_in6.sin6_addr.__in6_union.__s6_addr }}});
                    setValue(addr + {{{ C_STRUCTS.sockaddr_in6.sin6_port }}}, conn.port, 'i16');
                    setValue(addr + {{{ C_STRUCTS.sockaddr_in6.sin6_family }}}, {{{ cDefine('AF_INET6') }}}, 'i16');
                    setValue(addrlen, {{{ C_STRUCTS.sockaddr_in6.__size__ }}}, 'i32');
                    break;
            }
        }
        
        (function(info){
            var intervalling = false, interval;
            var outQueue = [];
            info.hasData = function() { return info.inQueue.length > 0 }
            info.ESTABLISHED = true;

            function onEnded(){
                info.ESTABLISHED = false;
                info.CLOSED = true;
            }
            info.sender = function(buf){
                outQueue.push(buf);
                trySend();
            };

            function send(data) {
                var buff = new Buffer(data);
                if(!info.socket["write"](buff)) info.paused = true;
            }
            function trySend() {
                if (!info.ESTABLISHED) {
                  if (!intervalling) {
                    intervalling = true;
                    info.interval = setInterval(trySend, 100);
                  }
                  return;
                }
                for (var i = 0; i < outQueue.length; i++) {
                   send(outQueue[i]);
                }
                outQueue.length = 0;
                if (intervalling) {
                    intervalling = false;
                    if(info.interval) clearInterval(info.interval);
                }
            }

            info.socket["on"]('drain',function(){
               info.paused = false;
            });

            info.socket["on"]('data',function(buf){
                info.inQueue.push(new Uint8Array(buf));
            });

            info.socket["on"]('close',onEnded);
            info.socket["on"]('error',onEnded);
            info.socket["on"]('end',onEnded);
            info.socket["on"]('timeout',function(){
                info.socket["end"]();
                onEnded();
            });
        })(conn);
        
        return newfd;

    },
   /*
    *  http://pubs.opengroup.org/onlinepubs/009695399/functions/select.html
    */
    select: function(nfds, readfds, writefds, exceptfds, timeout) {
        // readfds are supported,
        // writefds checks socket open status
        // exceptfds not supported
        // timeout is always 0 - fully async
        assert(!exceptfds);
        
        var errorCondition = 0;

        function canRead(info) {
          // make sure hasData exists. 
          // we do create it when the socket is connected, 
          // but other implementations may create it lazily
          if(info.stream){
           if ((info.socket["_readableState"]["ended"] || info.socket["errorEmitted"] ) && info.inQueue.length == 0) {
             errorCondition = -1;
             return false;
           }
           return info.hasData && info.hasData();
          }else{
            if(info.socket["_receiving"] || info.socket["_bound"]) return (info.hasData && info.hasData());           
            errorCondition = -1;
            return false;
          }
        }

        function canWrite(info) {
          // make sure socket exists. 
          // we do create it when the socket is connected, 
          // but other implementations may create it lazily
          if(info.stream){
              if (info.socket["_writableState"]["ended"] || info.socket["_writableState"]["ending"] || info.socket["errorEmitted"]) {
                errorCondition = -1;
                return false;
              }
              return info.socket && info.socket["writable"]
          }else{
            if(info.socket["_receiving"] || info.socket["_bound"]) return (info.hasData && info.hasData());           
            errorCondition = -1;
            return false;
          }
        }

        function checkfds(nfds, fds, can) {
          if (!fds) return 0;

          var bitsSet = 0;
          var dstLow  = 0;
          var dstHigh = 0;
          var srcLow  = {{{ makeGetValue('fds', 0, 'i32') }}};
          var srcHigh = {{{ makeGetValue('fds', 4, 'i32') }}};
          nfds = Math.min(64, nfds); // fd sets have 64 bits

          for (var fd = 0; fd < nfds; fd++) {
            var mask = 1 << (fd % 32), int = fd < 32 ? srcLow : srcHigh;
            if (int & mask) {
              // index is in the set, check if it is ready for read
              var info = FS.streams[fd];
              if (info && can(info)) {
                // set bit
                fd < 32 ? (dstLow = dstLow | mask) : (dstHigh = dstHigh | mask);
                bitsSet++;
              }
            }
          }

          {{{ makeSetValue('fds', 0, 'dstLow', 'i32') }}};
          {{{ makeSetValue('fds', 4, 'dstHigh', 'i32') }}};
          return bitsSet;
        }

        var totalHandles = checkfds(nfds, readfds, canRead) + checkfds(nfds, writefds, canWrite);
        if (errorCondition) {
          ___setErrNo(ERRNO_CODES.EBADF);
          return -1;
        } else {
          return totalHandles;
        }
    },

    socketpair__deps: ['__setErrNo', '$ERRNO_CODES'],
    socketpair: function(domain, type, protocol, sv) {
        // int socketpair(int domain, int type, int protocol, int sv[2]);
        // http://pubs.opengroup.org/onlinepubs/009695399/functions/socketpair.html
        ___setErrNo(ERRNO_CODES.EOPNOTSUPP);
        return -1;
    },

    //http://pubs.opengroup.org/onlinepubs/009695399/functions/getsockname.html
    getsockname__deps: ['__setErrNo', '$ERRNO_CODES', '$NodeSockets'],
    getsockname: function(fd, addr, len) {
        return -1;
    },
});

