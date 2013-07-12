mergeInto(LibraryManager.library, {
    inet_ntop__deps: ['__setErrNo', '$ERRNO_CODES','inet_ntop4','inet_ntop6'],
    inet_ntop:  function(af, src, dst, size){
        switch(af){
            case {{{ cDefine('AF_INET') }}}:
                return _inet_ntop4(src,dst,size);
            case {{{ cDefine('AF_INET6') }}}:
                return _inet_ntop6(src,dst,size);
            default:
                ___setErrNo(ERRNO_CODES.EAFNOSUPPORT);
                return 0;
        }
   },
   inet_pton__deps: ['__setErrNo', '$ERRNO_CODES','inet_pton4','inet_pton6'],
   inet_pton: function(af,src,dst){
        switch(af){
            case {{{ cDefine('AF_INET') }}}:
                return _inet_pton4(src,dst);
            case {{{ cDefine('AF_INET6') }}}:
                return _inet_pton6(src,dst);
            default:
                ___setErrNo(ERRNO_CODES.EAFNOSUPPORT);
                return -1;
        }
   },
   inet_addr: function(ptr) {
     var b = Pointer_stringify(ptr).split(".");
     if (b.length !== 4) return -1; // we return -1 for error, and otherwise a uint32. this helps inet_pton differentiate
     return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
   },
   inet_aton_raw: function(str) {
        var b = str.split(".");
        return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
   },
   inet_ntoa_raw: function(addr) {
        return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
   },
   inet_ntoa__deps: ['inet_ntoa_raw'],
   inet_ntoa: function(in_addr) {
    if (!_inet_ntoa.buffer) {
      _inet_ntoa.buffer = _malloc(1024);
    }
    var addr = getValue(in_addr, 'i32');
    var str = _inet_ntoa_raw(addr);
    writeStringToMemory(str.substr(0, 1024), _inet_ntoa.buffer);
    return _inet_ntoa.buffer;
   },

   inet_aton__deps: ['inet_addr'],
   inet_aton: function(cp, inp) {
    var addr = _inet_addr(cp);
    setValue(inp, addr, 'i32');
    if (addr < 0) return 0;
    return 1;
   },

   inet_ntop4__deps: ['__setErrNo', '$ERRNO_CODES','inet_ntoa_raw'],
   inet_ntop4: function(src,dst,size){
        var str = _inet_ntoa_raw(getValue(src, 'i32'));
        if(str.length+1 > size){
            ___setErrNo(ERRNO_CODES.ENOSPC);
            return 0;
        }
        writeStringToMemory(str,dst);
        return dst;
   },

   inet_ntop6__deps: ['__setErrNo', '$ERRNO_CODES','inet_ntop6_raw'],
   inet_ntop6: function(src, dst, size){
        var str = _inet_ntop6_raw(src);
        if(str.length+1 > size){
            ___setErrNo(ERRNO_CODES.ENOSPC);
            return 0;
        }
        writeStringToMemory(str,dst);
        return dst;
   },
   inet_ntop6_raw__deps: ['htons'],
   inet_ntop6_raw: function(src){
    var str = "";
    var word=0;
    var longest=0;
    var lastzero=0;
    var zstart=0;
    var len=0;
    var i=0;

    var hasipv4 = true;
    var v4part = "";
    for(i=0;i<10;i++){
        if(HEAPU8[src+i] !== 0) {hasipv4 = false;break;}
    }

    if(hasipv4){
        v4part = HEAPU8[src+12]+"."+HEAPU8[src+13]+"."+HEAPU8[src+14]+"."+HEAPU8[src+15];
        if(HEAPU8[src+10]==255 && HEAPU8[src+11]==255) {
            str="::ffff:";//IPv4-mapped IPv6 address
            str+=v4part;
            return str;
        }
        if(HEAPU8[src+11]==0 && HEAPU8[src+11]==0){//IPv4-compatible
             str="::";
            //loopback or any ?    
            if(v4part == "0.0.0.0") v4part = "";
            if(v4part == "0.0.0.1") v4part = "1";
            str+=v4part;
            return str;
        }
    }

    //first run to find the longest consecutive zeros
    for(word=0;word<8;word++){
        if(HEAPU16[(src+word*2)>>1]==0) {
            if(word - lastzero > 1){
                len = 0;
            }
            lastzero = word;
            len++;
        }
        if(len > longest) {
            longest = len;
            zstart = word - longest + 1;
        }
    }

    for(word=0;word<8;word++){
        if(longest>1){
          if(HEAPU16[(src+word*2)>>1]==0 && word >= zstart && word < (zstart+longest) ){
            if(word==zstart) {
                str+=":";
                if(zstart==0) str+=":";
            }
            continue;
          }
        }
        str+=Number(_htons(HEAPU16[(src+word*2)>>1])).toString(16);
        str+= word<7? ":" : "";
    }
    return str;
   },
   inet_pton4__deps: ['inet_addr'],
   inet_pton4: function(src,dst){
        var ret = _inet_addr(src);
        if (ret == -1 || isNaN(ret)) return 0;
        setValue(dst, ret, 'i32');
        return 1;
   },
   inet_pton6__deps: ['inet_pton6_raw'],
   inet_pton6:function(src,dst){
        return _inet_pton6_raw(Pointer_stringify(src),dst);
   },
   inet_pton6_raw__deps:['htons'],
   inet_pton6_raw: function(addr,dst){
        var words;
        var w,offset,z,i;
        /* http://home.deds.nl/~aeron/regex/ */
        var valid6regx=/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i
        if(!valid6regx.test(addr)){
            return 0;
        }
        if(addr == "::"){
            for(i=0;i<16;i++) HEAPU8[dst+i]=0;
            return 1;
        }
        if(addr.indexOf("::")==0){
            addr = addr.replace("::","Z:");
        }else{
            addr = addr.replace("::",":Z:");
        }

        if(addr.indexOf(".")>0){
            addr = addr.replace(new RegExp('[.]', 'g'),":");
            words = addr.split(":");
            words[words.length-4] = parseInt(words[words.length-4]) + parseInt(words[words.length-3])*256;
            words[words.length-3] = parseInt(words[words.length-2]) + parseInt(words[words.length-1])*256;
            words = words.slice(0,words.length-2);
        }else{
            words = addr.split(":");
        }

        offset = 0; z=0;
        for(w=0;w<words.length;w++){
            if(typeof words[w] === 'string'){
                if(words[w]=='Z'){
                  for(z=0; z< (8 - words.length+1); z++){
                    HEAPU16[(dst+(w+z)*2)>>1] = 0;
                  }
                  offset = z-1;
                }else{
                  HEAPU16[(dst+(w+offset)*2)>>1] = _htons(parseInt(words[w],16));
                }
            }else HEAPU16[(dst+(w+offset)*2)>>1] = words[w];
        }
        return 1;        
   }
});
