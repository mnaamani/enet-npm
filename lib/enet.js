var Buffer = require("buffer").Buffer;
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
          var $host=0;
          var $port=0;
          if($address){
              $host = HEAPU32[(($address)>>2)];
              $port = HEAPU16[(($address+4)>>1)];
          }
          if(udp_sockets[$socket]){
              //console.error("binding to",long2ip($host),$port);
              udp_sockets[$socket].bind($port,long2ip($host));
              return 0;
          }
          return -1;//todo: set error number
        };
        _enet_socket_listen = function($socket, $backlog){
        };        
        _enet_socket_set_option = function(){
            return 0;
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
            HEAPU8[($data+i)|0]=packet.data.readUInt8(i);
          }
          set_sockaddr_in($sin,1,_htons(packet.port),ip2long(packet.ip));
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
        __packet_filter = function(host_ptr){
           var host = new ENetHost(host_ptr);
           var addr = host.receivedAddress();
           return global_packet_filter(addr.address(),addr.port());
        }
});//preRun
// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
try {
  this['Module'] = Module;
} catch(e) {
  this['Module'] = Module = {};
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };
  Module['readBinary'] = function(filename) { return Module['read'](filename, true) };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  if (!Module['arguments']) {
    Module['arguments'] = process['argv'].slice(2);
  }
}
if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  Module['read'] = read;
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (!Module['arguments']) {
    if (typeof scriptArgs != 'undefined') {
      Module['arguments'] = scriptArgs;
    } else if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER) {
  if (!Module['print']) {
    Module['print'] = function(x) {
      console.log(x);
    };
  }
  if (!Module['printErr']) {
    Module['printErr'] = function(x) {
      console.log(x);
    };
  }
}
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (!Module['arguments']) {
    if (typeof arguments != 'undefined') {
      Module['arguments'] = arguments;
    }
  }
}
if (ENVIRONMENT_IS_WORKER) {
  // We can do very little here...
  var TRY_USE_DUMP = false;
  if (!Module['print']) {
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  Module['load'] = importScripts;
}
if (!ENVIRONMENT_IS_WORKER && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_SHELL) {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
if (!Module['preRun']) Module['preRun'] = [];
if (!Module['postRun']) Module['postRun'] = [];
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      var logg = log2(quantum);
      return '((((' +target + ')+' + (quantum-1) + ')>>' + logg + ')<<' + logg + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (/^\[\d+\ x\ (.*)\]/.test(type)) return true; // [15 x ?] blocks. Like structs
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type, quantumSize) {
    if (Runtime.QUANTUM_SIZE == 1) return 1;
    var size = {
      '%i1': 1,
      '%i8': 1,
      '%i16': 2,
      '%i32': 4,
      '%i64': 8,
      "%float": 4,
      "%double": 8
    }['%'+type]; // add '%' since float and double confuse Closure compiler as keys, and also spidermonkey as a compiler will remove 's from '_i8' etc
    if (!size) {
      if (type.charAt(type.length-1) == '*') {
        size = Runtime.QUANTUM_SIZE; // A pointer
      } else if (type[0] == 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 == 0);
        size = bits/8;
      }
    }
    return size;
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 4,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    type.flatIndexes = type.fields.map(function(field) {
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        size = Types.types[field].flatSize;
        alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        throw 'Unclear type in struct: ' + field + ', in ' + type.name_ + ' :: ' + dump(Types.types[type.name_]);
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return FUNCTION_TABLE[ptr].apply(null, args);
    } else {
      return FUNCTION_TABLE[ptr]();
    }
  },
  addFunction: function (func) {
    var table = FUNCTION_TABLE;
    var ret = table.length;
    table.push(func);
    table.push(0);
    return ret;
  },
  removeFunction: function (index) {
    var table = FUNCTION_TABLE;
    table[index] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xff;
      if (needed) {
        buffer.push(code);
        needed--;
      }
      if (buffer.length == 0) {
        if (code < 128) return String.fromCharCode(code);
        buffer.push(code);
        if (code > 191 && code < 224) {
          needed = 1;
        } else {
          needed = 2;
        }
        return '';
      }
      if (needed > 0) return '';
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var ret;
      if (c1 > 191 && c1 < 224) {
        ret = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
      } else {
        ret = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = ((((STACKTOP)+3)>>2)<<2); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = ((((STATICTOP)+3)>>2)<<2); if (STATICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 4))*(quantum ? quantum : 4); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? (((low)>>>(0))+(((high)>>>(0))*4294967296)) : (((low)>>>(0))+(((high)|(0))*4294967296))); return ret; },
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var setjmpId = 1; // Used in setjmp/longjmp
var setjmpLabels = {};
var ABORT = false;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function abort(text) {
  Module.print(text + ':\n' + (new Error).stack);
  ABORT = true;
  throw "Assertion: " + text;
}
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = globalScope['Module']['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length+1);
      writeStringToMemory(value, ret);
      return ret;
    } else if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,Math.min(Math.floor((value)/4294967296), 4294967295)>>>0],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': (HEAPF64[(tempDoublePtr)>>3]=value,HEAP32[((ptr)>>2)]=HEAP32[((tempDoublePtr)>>2)],HEAP32[(((ptr)+(4))>>2)]=HEAP32[(((tempDoublePtr)+(4))>>2)]); break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return (HEAP32[((tempDoublePtr)>>2)]=HEAP32[((ptr)>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((ptr)+(4))>>2)],HEAPF64[(tempDoublePtr)>>3]);
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_NONE = 3; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    HEAPU8.set(new Uint8Array(slab), ret);
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return ((x+4095)>>12)<<12;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STACK_ROOT, STACKTOP, STACK_MAX;
var STATICTOP;
function enlargeMemory() {
  // TOTAL_MEMORY is the current size of the actual array, and STATICTOP is the new top.
  while (TOTAL_MEMORY <= STATICTOP) { // Simple heuristic. Override enlargeMemory() if your program has something more optimal for it
    TOTAL_MEMORY = alignMemoryPage(2*TOTAL_MEMORY);
  }
  assert(TOTAL_MEMORY <= Math.pow(2, 30)); // 2^30==1GB is a practical maximum - 2^31 is already close to possible negative numbers etc.
  var oldHEAP8 = HEAP8;
  var buffer = new ArrayBuffer(TOTAL_MEMORY);
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
  HEAP8.set(oldHEAP8);
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 409600;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 1048576;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
STACK_ROOT = STACKTOP = Runtime.alignMemory(1);
STACK_MAX = TOTAL_STACK; // we lose a little stack here, but TOTAL_STACK is nice and round so use that as the max
var tempDoublePtr = Runtime.alignMemory(allocate(12, 'i8', ALLOC_STACK), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
STATICTOP = STACK_MAX;
assert(STATICTOP < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var nullString = allocate(intArrayFromString('(null)'), 'i8', ALLOC_STACK);
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATINIT__ = []; // functions called during startup
var __ATMAIN__ = []; // functions called when main() is to be run
var __ATEXIT__ = []; // functions called during shutdown
var runtimeInitialized = false;
function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math.imul) Math.imul = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var calledInit = false, calledRun = false;
var runDependencyWatcher = null;
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 6000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    } 
    // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
    if (!calledRun && shouldRunNow) run();
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
function addPreRun(func) {
  if (!Module['preRun']) Module['preRun'] = [];
  else if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
  Module['preRun'].push(func);
}
var awaitingMemoryInitializer = false;
function loadMemoryInitializer(filename) {
  function applyData(data) {
    HEAPU8.set(data, TOTAL_STACK);
    runPostSets();
  }
  // always do this asynchronously, to keep shell and web as similar as possible
  addPreRun(function() {
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      applyData(Module['readBinary'](filename));
    } else {
      Browser.asyncLoad(filename, function(data) {
        applyData(data);
      }, function(data) {
        throw 'could not load memory initializer ' + filename;
      });
    }
  });
  awaitingMemoryInitializer = false;
}
// === Body ===
assert(STATICTOP == STACK_MAX); assert(STACK_MAX == TOTAL_STACK);
STATICTOP += 2412;
assert(STATICTOP < TOTAL_MEMORY);
var _stderr;
var ___progname;
var __ZTVSt9exception;
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTISt9exception;
var __ZNSt9bad_allocC1Ev;
var __ZNSt9bad_allocD1Ev;
var __ZNSt20bad_array_new_lengthC1Ev;
var __ZNSt20bad_array_new_lengthD1Ev;
var __ZNSt20bad_array_new_lengthD2Ev;
var _err;
var _errx;
var _warn1;
var _warnx;
var _verr;
var _verrx;
var _vwarn;
var _vwarnx;
var _stderr = _stderr=allocate([0,0,0,0], "i8", ALLOC_STATIC);
var __ZTVN10__cxxabiv120__si_class_type_infoE = __ZTVN10__cxxabiv120__si_class_type_infoE=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
/* memory initializer */ allocate([0,0,0,0,111,112,116,105,111,110,32,114,101,113,117,105,114,101,115,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,115,0,0,0,111,112,116,105,111,110,32,114,101,113,117,105,114,101,115,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,99,0,0,0,0,0,0,0,0,0,36,64,0,0,0,0,0,0,89,64,0,0,0,0,0,136,195,64,0,0,0,0,132,215,151,65,0,128,224,55,121,195,65,67,23,110,5,181,181,184,147,70,245,249,63,233,3,79,56,77,50,29,48,249,72,119,130,90,60,191,115,127,221,79,21,117,132,70,6,0,0,0,0,0,63,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,255,255,255,255,111,112,116,105,111,110,32,100,111,101,115,110,39,116,32,116,97,107,101,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,46,42,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,117,110,107,110,111,119,110,32,111,112,116,105,111,110,32,45,45,32,37,115,0,0,0,0,117,110,107,110,111,119,110,32,111,112,116,105,111,110,32,45,45,32,37,99,0,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,48,0,0,0,44,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,8,0,0,0,24,0,0,0,8,0,0,0,12,0,0,0,16,0,0,0,24,0,0,0,0,0,0,0,40,0,0,0,30,0,0,0,42,0,0,0,97,109,98,105,103,117,111,117,115,32,111,112,116,105,111,110,32,45,45,32,37,46,42,115,0,0,0,0,37,115,58,32,0,0,0,0,80,79,83,73,88,76,89,95,67,79,82,82,69,67,84,0,109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,37,115,58,32,0,0,0,0,37,115,10,0,37,115,10,0,69,114,114,111,114,32,114,101,99,101,105,118,105,110,103,32,105,110,99,111,109,105,110,103,32,112,97,99,107,101,116,115,0,0,0,0,37,115,58,32,0,0,0,0,0,0,0,0,37,115,58,32,0,0,0,0,115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0,0,0,0,10,0,0,0,58,32,0,0,10,0,0,0,58,32,0,0,69,114,114,111,114,32,115,101,110,100,105,110,103,32,111,117,116,103,111,105,110,103,32,112,97,99,107,101,116,115,0,0,69,114,114,111,114,32,100,105,115,112,97,116,99,104,105,110,103,32,105,110,99,111,109,105,110,103,32,112,97,99,107,101,116,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,76,73,6,0,36,0,0,0,6,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,88,73,6,0,36,0,0,0,2,0,0,0,38,0,0,0,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,83,116,50,48,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0,0,0,0,0,0,0,0,32,73,6,0,0,0,0,0,0,0,0,0,48,73,6,0,76,73,6,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, TOTAL_STACK)
function runPostSets() {
HEAP32[((411980)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
HEAP32[((411988)>>2)]=__ZTISt9exception;
HEAP32[((411992)>>2)]=(((__ZTVN10__cxxabiv120__si_class_type_infoE+8)|0));
__ZNSt9bad_allocC1Ev = 4;
__ZNSt9bad_allocD1Ev = 36;
__ZNSt20bad_array_new_lengthC1Ev = 26;
__ZNSt20bad_array_new_lengthD1Ev = (36);
__ZNSt20bad_array_new_lengthD2Ev = (36);
_err = 34;
_errx = 8;
_warn1 = 32;
_warnx = 44;
_verr = 20;
_verrx = 14;
_vwarn = 24;
_vwarnx = 22;
}
if (!awaitingMemoryInitializer) runPostSets();
  var __packet_filter=undefined;
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      ret = dest|0;
      if ((dest&3) == (src&3)) {
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[(dest)]=HEAP8[(src)];
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        while ((num|0) >= 4) {
          HEAP32[((dest)>>2)]=HEAP32[((src)>>2)];
          dest = (dest+4)|0;
          src = (src+4)|0;
          num = (num-4)|0;
        }
      }
      while ((num|0) > 0) {
        HEAP8[(dest)]=HEAP8[(src)];
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      return ret|0;
    }var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function _abort() {
      ABORT = true;
      throw 'abort() at ' + (new Error().stack);
    }
  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
      stop = (ptr + num)|0;
      if ((num|0) >= 20) {
        // This is unaligned, but quite large, so work hard to get to aligned settings
        value = value & 0xff;
        unaligned = ptr & 3;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
        stop4 = stop & ~3;
        if (unaligned) {
          unaligned = (ptr + 4 - unaligned)|0;
          while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
            HEAP8[(ptr)]=value;
            ptr = (ptr+1)|0;
          }
        }
        while ((ptr|0) < (stop4|0)) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      while ((ptr|0) < (stop|0)) {
        HEAP8[(ptr)]=value;
        ptr = (ptr+1)|0;
      }
    }var _llvm_memset_p0i8_i32=_memset;
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  function _htons(value) {
      return ((value & 0xff) << 8) + ((value & 0xff00) >> 8);
    }
  function _htonl(value) {
      return ((value & 0xff) << 24) + ((value & 0xff00) << 8) +
             ((value & 0xff0000) >>> 8) + ((value & 0xff000000) >>> 24);
    }
  var _ntohl=_htonl;
  var _ntohs=_htons;
  var ERRNO_CODES={E2BIG:7,EACCES:13,EADDRINUSE:98,EADDRNOTAVAIL:99,EAFNOSUPPORT:97,EAGAIN:11,EALREADY:114,EBADF:9,EBADMSG:74,EBUSY:16,ECANCELED:125,ECHILD:10,ECONNABORTED:103,ECONNREFUSED:111,ECONNRESET:104,EDEADLK:35,EDESTADDRREQ:89,EDOM:33,EDQUOT:122,EEXIST:17,EFAULT:14,EFBIG:27,EHOSTUNREACH:113,EIDRM:43,EILSEQ:84,EINPROGRESS:115,EINTR:4,EINVAL:22,EIO:5,EISCONN:106,EISDIR:21,ELOOP:40,EMFILE:24,EMLINK:31,EMSGSIZE:90,EMULTIHOP:72,ENAMETOOLONG:36,ENETDOWN:100,ENETRESET:102,ENETUNREACH:101,ENFILE:23,ENOBUFS:105,ENODATA:61,ENODEV:19,ENOENT:2,ENOEXEC:8,ENOLCK:37,ENOLINK:67,ENOMEM:12,ENOMSG:42,ENOPROTOOPT:92,ENOSPC:28,ENOSR:63,ENOSTR:60,ENOSYS:38,ENOTCONN:107,ENOTDIR:20,ENOTEMPTY:39,ENOTRECOVERABLE:131,ENOTSOCK:88,ENOTSUP:95,ENOTTY:25,ENXIO:6,EOPNOTSUPP:45,EOVERFLOW:75,EOWNERDEAD:130,EPERM:1,EPIPE:32,EPROTO:71,EPROTONOSUPPORT:93,EPROTOTYPE:91,ERANGE:34,EROFS:30,ESPIPE:29,ESRCH:3,ESTALE:116,ETIME:62,ETIMEDOUT:110,ETXTBSY:26,EWOULDBLOCK:11,EXDEV:18};
  function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      if (!___setErrNo.ret) ___setErrNo.ret = allocate([0], 'i32', ALLOC_STATIC);
      HEAP32[((___setErrNo.ret)>>2)]=value
      return value;
    }
  var _stdin=allocate(1, "i32*", ALLOC_STACK);
  var _stdout=allocate(1, "i32*", ALLOC_STACK);
  var _stderr=allocate(1, "i32*", ALLOC_STACK);
  var __impure_ptr=allocate(1, "i32*", ALLOC_STACK);var FS={currentPath:"/",nextInode:2,streams:[null],ignorePermissions:true,joinPath:function (parts, forceRelative) {
        var ret = parts[0];
        for (var i = 1; i < parts.length; i++) {
          if (ret[ret.length-1] != '/') ret += '/';
          ret += parts[i];
        }
        if (forceRelative && ret[0] == '/') ret = ret.substr(1);
        return ret;
      },absolutePath:function (relative, base) {
        if (typeof relative !== 'string') return null;
        if (base === undefined) base = FS.currentPath;
        if (relative && relative[0] == '/') base = '';
        var full = base + '/' + relative;
        var parts = full.split('/').reverse();
        var absolute = [''];
        while (parts.length) {
          var part = parts.pop();
          if (part == '' || part == '.') {
            // Nothing.
          } else if (part == '..') {
            if (absolute.length > 1) absolute.pop();
          } else {
            absolute.push(part);
          }
        }
        return absolute.length == 1 ? '/' : absolute.join('/');
      },analyzePath:function (path, dontResolveLastLink, linksVisited) {
        var ret = {
          isRoot: false,
          exists: false,
          error: 0,
          name: null,
          path: null,
          object: null,
          parentExists: false,
          parentPath: null,
          parentObject: null
        };
        path = FS.absolutePath(path);
        if (path == '/') {
          ret.isRoot = true;
          ret.exists = ret.parentExists = true;
          ret.name = '/';
          ret.path = ret.parentPath = '/';
          ret.object = ret.parentObject = FS.root;
        } else if (path !== null) {
          linksVisited = linksVisited || 0;
          path = path.slice(1).split('/');
          var current = FS.root;
          var traversed = [''];
          while (path.length) {
            if (path.length == 1 && current.isFolder) {
              ret.parentExists = true;
              ret.parentPath = traversed.length == 1 ? '/' : traversed.join('/');
              ret.parentObject = current;
              ret.name = path[0];
            }
            var target = path.shift();
            if (!current.isFolder) {
              ret.error = ERRNO_CODES.ENOTDIR;
              break;
            } else if (!current.read) {
              ret.error = ERRNO_CODES.EACCES;
              break;
            } else if (!current.contents.hasOwnProperty(target)) {
              ret.error = ERRNO_CODES.ENOENT;
              break;
            }
            current = current.contents[target];
            if (current.link && !(dontResolveLastLink && path.length == 0)) {
              if (linksVisited > 40) { // Usual Linux SYMLOOP_MAX.
                ret.error = ERRNO_CODES.ELOOP;
                break;
              }
              var link = FS.absolutePath(current.link, traversed.join('/'));
              ret = FS.analyzePath([link].concat(path).join('/'),
                                   dontResolveLastLink, linksVisited + 1);
              return ret;
            }
            traversed.push(target);
            if (path.length == 0) {
              ret.exists = true;
              ret.path = traversed.join('/');
              ret.object = current;
            }
          }
        }
        return ret;
      },findObject:function (path, dontResolveLastLink) {
        FS.ensureRoot();
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },createObject:function (parent, name, properties, canRead, canWrite) {
        if (!parent) parent = '/';
        if (typeof parent === 'string') parent = FS.findObject(parent);
        if (!parent) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent path must exist.');
        }
        if (!parent.isFolder) {
          ___setErrNo(ERRNO_CODES.ENOTDIR);
          throw new Error('Parent must be a folder.');
        }
        if (!parent.write && !FS.ignorePermissions) {
          ___setErrNo(ERRNO_CODES.EACCES);
          throw new Error('Parent folder must be writeable.');
        }
        if (!name || name == '.' || name == '..') {
          ___setErrNo(ERRNO_CODES.ENOENT);
          throw new Error('Name must not be empty.');
        }
        if (parent.contents.hasOwnProperty(name)) {
          ___setErrNo(ERRNO_CODES.EEXIST);
          throw new Error("Can't overwrite object.");
        }
        parent.contents[name] = {
          read: canRead === undefined ? true : canRead,
          write: canWrite === undefined ? false : canWrite,
          timestamp: Date.now(),
          inodeNumber: FS.nextInode++
        };
        for (var key in properties) {
          if (properties.hasOwnProperty(key)) {
            parent.contents[name][key] = properties[key];
          }
        }
        return parent.contents[name];
      },createFolder:function (parent, name, canRead, canWrite) {
        var properties = {isFolder: true, isDevice: false, contents: {}};
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createPath:function (parent, path, canRead, canWrite) {
        var current = FS.findObject(parent);
        if (current === null) throw new Error('Invalid parent.');
        path = path.split('/').reverse();
        while (path.length) {
          var part = path.pop();
          if (!part) continue;
          if (!current.contents.hasOwnProperty(part)) {
            FS.createFolder(current, part, canRead, canWrite);
          }
          current = current.contents[part];
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        properties.isFolder = false;
        return FS.createObject(parent, name, properties, canRead, canWrite);
      },createDataFile:function (parent, name, data, canRead, canWrite) {
        if (typeof data === 'string') {
          var dataArray = new Array(data.length);
          for (var i = 0, len = data.length; i < len; ++i) dataArray[i] = data.charCodeAt(i);
          data = dataArray;
        }
        var properties = {
          isDevice: false,
          contents: data.subarray ? data.subarray(0) : data // as an optimization, create a new array wrapper (not buffer) here, to help JS engines understand this object
        };
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function(chunkSize, length) {
            this.length = length;
            this.chunkSize = chunkSize;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % chunkSize;
            var chunkNum = Math.floor(idx / chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
          if (!hasByteServing) chunkSize = datalength;
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = new LazyUint8Array(chunkSize, datalength);
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * lazyArray.chunkSize;
            var end = (chunkNum+1) * lazyArray.chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile) {
        Browser.init();
        var fullname = FS.joinPath([parent, name], true);
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },createLink:function (parent, name, target, canRead, canWrite) {
        var properties = {isDevice: false, link: target};
        return FS.createFile(parent, name, properties, canRead, canWrite);
      },createDevice:function (parent, name, input, output) {
        if (!(input || output)) {
          throw new Error('A device must have at least one callback defined.');
        }
        var ops = {isDevice: true, input: input, output: output};
        return FS.createFile(parent, name, ops, Boolean(input), Boolean(output));
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },ensureRoot:function () {
        if (FS.root) return;
        // The main file system tree. All the contents are inside this.
        FS.root = {
          read: true,
          write: true,
          isFolder: true,
          isDevice: false,
          timestamp: Date.now(),
          inodeNumber: 1,
          contents: {}
        };
      },init:function (input, output, error) {
        // Make sure we initialize only once.
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureRoot();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input = input || Module['stdin'];
        output = output || Module['stdout'];
        error = error || Module['stderr'];
        // Default handlers.
        var stdinOverridden = true, stdoutOverridden = true, stderrOverridden = true;
        if (!input) {
          stdinOverridden = false;
          input = function() {
            if (!input.cache || !input.cache.length) {
              var result;
              if (typeof window != 'undefined' &&
                  typeof window.prompt == 'function') {
                // Browser.
                result = window.prompt('Input: ');
                if (result === null) result = String.fromCharCode(0); // cancel ==> EOF
              } else if (typeof readline == 'function') {
                // Command line.
                result = readline();
              }
              if (!result) result = '';
              input.cache = intArrayFromString(result + '\n', true);
            }
            return input.cache.shift();
          };
        }
        var utf8 = new Runtime.UTF8Processor();
        function simpleOutput(val) {
          if (val === null || val === 10) {
            output.printer(output.buffer.join(''));
            output.buffer = [];
          } else {
            output.buffer.push(utf8.processCChar(val));
          }
        }
        if (!output) {
          stdoutOverridden = false;
          output = simpleOutput;
        }
        if (!output.printer) output.printer = Module['print'];
        if (!output.buffer) output.buffer = [];
        if (!error) {
          stderrOverridden = false;
          error = simpleOutput;
        }
        if (!error.printer) error.printer = Module['print'];
        if (!error.buffer) error.buffer = [];
        // Create the temporary folder, if not already created
        try {
          FS.createFolder('/', 'tmp', true, true);
        } catch(e) {}
        // Create the I/O devices.
        var devFolder = FS.createFolder('/', 'dev', true, true);
        var stdin = FS.createDevice(devFolder, 'stdin', input);
        var stdout = FS.createDevice(devFolder, 'stdout', null, output);
        var stderr = FS.createDevice(devFolder, 'stderr', null, error);
        FS.createDevice(devFolder, 'tty', input, output);
        // Create default streams.
        FS.streams[1] = {
          path: '/dev/stdin',
          object: stdin,
          position: 0,
          isRead: true,
          isWrite: false,
          isAppend: false,
          isTerminal: !stdinOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[2] = {
          path: '/dev/stdout',
          object: stdout,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stdoutOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        FS.streams[3] = {
          path: '/dev/stderr',
          object: stderr,
          position: 0,
          isRead: false,
          isWrite: true,
          isAppend: false,
          isTerminal: !stderrOverridden,
          error: false,
          eof: false,
          ungotten: []
        };
        assert(Math.max(_stdin, _stdout, _stderr) < 1024); // make sure these are low, we flatten arrays with these
        HEAP32[((_stdin)>>2)]=1;
        HEAP32[((_stdout)>>2)]=2;
        HEAP32[((_stderr)>>2)]=3;
        // Other system paths
        FS.createPath('/', 'dev/shm/tmp', true, true); // temp files
        // Newlib initialization
        for (var i = FS.streams.length; i < Math.max(_stdin, _stdout, _stderr) + 4; i++) {
          FS.streams[i] = null; // Make sure to keep FS.streams dense
        }
        FS.streams[_stdin] = FS.streams[1];
        FS.streams[_stdout] = FS.streams[2];
        FS.streams[_stderr] = FS.streams[3];
        allocate([ allocate(
          [0, 0, 0, 0, _stdin, 0, 0, 0, _stdout, 0, 0, 0, _stderr, 0, 0, 0],
          'void*', ALLOC_STATIC) ], 'void*', ALLOC_NONE, __impure_ptr);
      },quit:function () {
        if (!FS.init.initialized) return;
        // Flush any partially-printed lines in stdout and stderr. Careful, they may have been closed
        if (FS.streams[2] && FS.streams[2].object.output.buffer.length > 0) FS.streams[2].object.output(10);
        if (FS.streams[3] && FS.streams[3].object.output.buffer.length > 0) FS.streams[3].object.output(10);
      },standardizePath:function (path) {
        if (path.substr(0, 2) == './') path = path.substr(2);
        return path;
      },deleteFile:function (path) {
        path = FS.analyzePath(path);
        if (!path.parentExists || !path.exists) {
          throw 'Invalid path ' + path;
        }
        delete path.parentObject.contents[path.name];
      }};
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream || stream.object.isDevice) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (stream.object.isFolder) {
        ___setErrNo(ERRNO_CODES.EISDIR);
        return -1;
      } else if (nbyte < 0 || offset < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        var contents = stream.object.contents;
        while (contents.length < offset) contents.push(0);
        for (var i = 0; i < nbyte; i++) {
          contents[offset + i] = HEAPU8[(((buf)+(i))|0)];
        }
        stream.object.timestamp = Date.now();
        return i;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.streams[fildes];
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else if (!stream.isWrite) {
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      } else if (nbyte < 0) {
        ___setErrNo(ERRNO_CODES.EINVAL);
        return -1;
      } else {
        if (stream.object.isDevice) {
          if (stream.object.output) {
            for (var i = 0; i < nbyte; i++) {
              try {
                stream.object.output(HEAP8[(((buf)+(i))|0)]);
              } catch (e) {
                ___setErrNo(ERRNO_CODES.EIO);
                return -1;
              }
            }
            stream.object.timestamp = Date.now();
            return i;
          } else {
            ___setErrNo(ERRNO_CODES.ENXIO);
            return -1;
          }
        } else {
          var bytesWritten = _pwrite(fildes, buf, nbyte, stream.position);
          if (bytesWritten != -1) stream.position += bytesWritten;
          return bytesWritten;
        }
      }
    }
  function _strlen(ptr) {
      ptr = ptr|0;
      var curr = 0;
      curr = ptr;
      while (HEAP8[(curr)]) {
        curr = (curr + 1)|0;
      }
      return (curr - ptr)|0;
    }function _fputs(s, stream) {
      // int fputs(const char *restrict s, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputs.html
      return _write(stream, s, _strlen(s));
    }
  function _fputc(c, stream) {
      // int fputc(int c, FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fputc.html
      var chr = unSign(c & 0xFF);
      HEAP8[((_fputc.ret)|0)]=chr
      var ret = _write(stream, _fputc.ret, 1);
      if (ret == -1) {
        if (FS.streams[stream]) FS.streams[stream].error = true;
        return -1;
      } else {
        return chr;
      }
    }function _puts(s) {
      // int puts(const char *s);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/puts.html
      // NOTE: puts() always writes an extra newline.
      var stdout = HEAP32[((_stdout)>>2)];
      var ret = _fputs(s, stdout);
      if (ret < 0) {
        return ret;
      } else {
        var newlineRet = _fputc(10, stdout);
        return (newlineRet < 0) ? -1 : ret + 1;
      }
    }
  var ERRNO_MESSAGES={1:"Operation not permitted",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"Input/output error",6:"No such device or address",8:"Exec format error",9:"Bad file descriptor",10:"No child processes",11:"Resource temporarily unavailable",12:"Cannot allocate memory",13:"Permission denied",14:"Bad address",16:"Device or resource busy",17:"File exists",18:"Invalid cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Inappropriate ioctl for device",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read-only file system",31:"Too many links",32:"Broken pipe",33:"Numerical argument out of domain",34:"Numerical result out of range",35:"Resource deadlock avoided",36:"File name too long",37:"No locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many levels of symbolic links",42:"No message of desired type",43:"Identifier removed",45:"Op not supported on transport endpoint",60:"Device not a stream",61:"No data available",62:"Timer expired",63:"Out of streams resources",67:"Link has been severed",71:"Protocol error",72:"Multihop attempted",74:"Bad message",75:"Value too large for defined data type",84:"Invalid or incomplete multibyte or wide character",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Protocol not supported",95:"Operation not supported",97:"Address family not supported by protocol",98:"Address already in use",99:"Cannot assign requested address",100:"Network is down",101:"Network is unreachable",102:"Network dropped connection on reset",103:"Software caused connection abort",104:"Connection reset by peer",105:"No buffer space available",106:"Transport endpoint is already connected",107:"Transport endpoint is not connected",110:"Connection timed out",111:"Connection refused",113:"No route to host",114:"Operation already in progress",115:"Operation now in progress",116:"Stale NFS file handle",122:"Disk quota exceeded",125:"Operation canceled",130:"Owner died",131:"State not recoverable"};function _strerror_r(errnum, strerrbuf, buflen) {
      if (errnum in ERRNO_MESSAGES) {
        if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
          return ___setErrNo(ERRNO_CODES.ERANGE);
        } else {
          var msg = ERRNO_MESSAGES[errnum];
          for (var i = 0; i < msg.length; i++) {
            HEAP8[(((strerrbuf)+(i))|0)]=msg.charCodeAt(i)
          }
          HEAP8[(((strerrbuf)+(i))|0)]=0
          return 0;
        }
      } else {
        return ___setErrNo(ERRNO_CODES.EINVAL);
      }
    }function _strerror(errnum) {
      if (!_strerror.buffer) _strerror.buffer = _malloc(256);
      _strerror_r(errnum, _strerror.buffer, 256);
      return _strerror.buffer;
    }
  function ___errno_location() {
      return ___setErrNo.ret;
    }function _perror(s) {
      // void perror(const char *s);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/perror.html
      var stdout = HEAP32[((_stdout)>>2)];
      if (s) {
        _fputs(s, stdout);
        _fputc(58, stdout);
        _fputc(32, stdout);
      }
      var errnum = HEAP32[((___errno_location())>>2)];
      _puts(_strerror(errnum));
    }
  function _gettimeofday(ptr) {
      // %struct.timeval = type { i32, i32 }
      var now = Date.now();
      HEAP32[((ptr)>>2)]=Math.floor(now/1000); // seconds
      HEAP32[(((ptr)+(4))>>2)]=Math.floor((now-1000*Math.floor(now/1000))*1000); // microseconds
      return 0;
    }
  var ___hostent_struct_layout={__size__:20,h_name:0,h_aliases:4,h_addrtype:8,h_length:12,h_addr_list:16};function _gethostbyname(name) {
      name = Pointer_stringify(name);
        if (!_gethostbyname.id) {
          _gethostbyname.id = 1;
          _gethostbyname.table = {};
        }
      var id = _gethostbyname.id++;
      assert(id < 65535);
      var fakeAddr = 172 | (29 << 8) | ((id & 0xff) << 16) | ((id & 0xff00) << 24);
      _gethostbyname.table[id] = name;
      // generate hostent
      var ret = _malloc(___hostent_struct_layout.__size__);
      var nameBuf = _malloc(name.length+1);
      writeStringToMemory(name, nameBuf);
      setValue(ret+___hostent_struct_layout.h_name, nameBuf, 'i8*');
      var aliasesBuf = _malloc(4);
      setValue(aliasesBuf, 0, 'i8*');
      setValue(ret+___hostent_struct_layout.h_aliases, aliasesBuf, 'i8**');
      setValue(ret+___hostent_struct_layout.h_addrtype, 1, 'i32');
      setValue(ret+___hostent_struct_layout.h_length, 4, 'i32');
      var addrListBuf = _malloc(12);
      setValue(addrListBuf, addrListBuf+8, 'i32*');
      setValue(addrListBuf+4, 0, 'i32*');
      setValue(addrListBuf+8, fakeAddr, 'i32');
      setValue(ret+___hostent_struct_layout.h_addr_list, addrListBuf, 'i8**');
      return ret;
    }
  function _inet_addr(ptr) {
      var b = Pointer_stringify(ptr).split(".");
      if (b.length !== 4) return -1; // we return -1 for error, and otherwise a uint32. this helps inet_pton differentiate
      return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
    }function _inet_aton(cp, inp) {
      var addr = _inet_addr(cp);
      setValue(inp, addr, 'i32');
      if (addr < 0) return 0;
      return 1;
    }
  function __inet_ntop_raw(addr) {
      return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
    }function _inet_ntop(af, src, dst, size) {
      var addr = getValue(src, 'i32');
      var str = __inet_ntop_raw(addr);
      writeStringToMemory(str.substr(0, size), dst);
      return dst;
    }function _inet_ntoa(in_addr) {
      if (!_inet_ntoa.buffer) {
        _inet_ntoa.buffer = _malloc(1024);
      }
      return _inet_ntop(0, in_addr, _inet_ntoa.buffer, 1024);
    }
  function _strncpy(pdest, psrc, num) {
      pdest = pdest|0; psrc = psrc|0; num = num|0;
      var padding = 0, curr = 0, i = 0;
      while ((i|0) < (num|0)) {
        curr = padding ? 0 : HEAP8[(((psrc)+(i))|0)];
        HEAP8[(((pdest)+(i))|0)]=curr
        padding = padding ? 1 : (HEAP8[(((psrc)+(i))|0)] == 0);
        i = (i+1)|0;
      }
      return pdest|0;
    }
  var _gethostbyaddr=undefined;
  var Sockets={BACKEND_WEBSOCKETS:0,BACKEND_WEBRTC:1,BUFFER_SIZE:10240,MAX_BUFFER_SIZE:10485760,backend:0,nextFd:1,fds:{},sockaddr_in_layout:{__size__:20,sin_family:0,sin_port:4,sin_addr:8,sin_zero:12,sin_zero_b:16},msghdr_layout:{__size__:28,msg_name:0,msg_namelen:4,msg_iov:8,msg_iovlen:12,msg_control:16,msg_controllen:20,msg_flags:24},backends:{0:{connect:function (info) {
            console.log('opening ws://' + info.host + ':' + info.port);
            info.socket = new WebSocket('ws://' + info.host + ':' + info.port, ['binary']);
            info.socket.binaryType = 'arraybuffer';
            var i32Temp = new Uint32Array(1);
            var i8Temp = new Uint8Array(i32Temp.buffer);
            info.inQueue = [];
            info.hasData = function() { return info.inQueue.length > 0 }
            if (!info.stream) {
              var partialBuffer = null; // in datagram mode, inQueue contains full dgram messages; this buffers incomplete data. Must begin with the beginning of a message
            }
            info.socket.onmessage = function(event) {
              assert(typeof event.data !== 'string' && event.data.byteLength); // must get binary data!
              var data = new Uint8Array(event.data); // make a typed array view on the array buffer
              if (info.stream) {
                info.inQueue.push(data);
              } else {
                // we added headers with message sizes, read those to find discrete messages
                if (partialBuffer) {
                  // append to the partial buffer
                  var newBuffer = new Uint8Array(partialBuffer.length + data.length);
                  newBuffer.set(partialBuffer);
                  newBuffer.set(data, partialBuffer.length);
                  // forget the partial buffer and work on data
                  data = newBuffer;
                  partialBuffer = null;
                }
                var currPos = 0;
                while (currPos+4 < data.length) {
                  i8Temp.set(data.subarray(currPos, currPos+4));
                  var currLen = i32Temp[0];
                  assert(currLen > 0);
                  if (currPos + 4 + currLen > data.length) {
                    break; // not enough data has arrived
                  }
                  currPos += 4;
                  info.inQueue.push(data.subarray(currPos, currPos+currLen));
                  currPos += currLen;
                }
                // If data remains, buffer it
                if (currPos < data.length) {
                  partialBuffer = data.subarray(currPos);
                }
              }
            }
            function send(data) {
              // TODO: if browser accepts views, can optimize this
              // ok to use the underlying buffer, we created data and know that the buffer starts at the beginning
              info.socket.send(data.buffer);
            }
            var outQueue = [];
            var intervalling = false, interval;
            function trySend() {
              if (info.socket.readyState != info.socket.OPEN) {
                if (!intervalling) {
                  intervalling = true;
                  console.log('waiting for socket in order to send');
                  interval = setInterval(trySend, 100);
                }
                return;
              }
              for (var i = 0; i < outQueue.length; i++) {
                send(outQueue[i]);
              }
              outQueue.length = 0;
              if (intervalling) {
                intervalling = false;
                clearInterval(interval);
              }
            }
            info.sender = function(data) {
              if (!info.stream) {
                // add a header with the message size
                var header = new Uint8Array(4);
                i32Temp[0] = data.length;
                header.set(i8Temp);
                outQueue.push(header);
              }
              outQueue.push(new Uint8Array(data));
              trySend();
            };
          }},1:{}}};function _connect(fd, addr, addrlen) {
      var info = Sockets.fds[fd];
      if (!info) return -1;
      info.connected = true;
      info.addr = getValue(addr + Sockets.sockaddr_in_layout.sin_addr, 'i32');
      info.port = _htons(getValue(addr + Sockets.sockaddr_in_layout.sin_port, 'i16'));
      info.host = __inet_ntop_raw(info.addr);
      // Support 'fake' ips from gethostbyname
      var parts = info.host.split('.');
      if (parts[0] == '172' && parts[1] == '29') {
        var low = Number(parts[2]);
        var high = Number(parts[3]);
        info.host = _gethostbyname.table[low + 0xff*high];
        assert(info.host, 'problem translating fake ip ' + parts);
      }
      try {
        Sockets.backends[Sockets.backend].connect(info);
      } catch(e) {
        Module.printErr('Error in connect(): ' + e);
        ___setErrNo(ERRNO_CODES.EACCES);
        return -1;
      }
      return 0;
    }function _bind(fd, addr, addrlen) {
      return _connect(fd, addr, addrlen);
    }
  function _listen(fd, backlog) {
      return 0;
    }
  function _socket(family, type, protocol) {
      var fd = Sockets.nextFd++;
      assert(fd < 64); // select() assumes socket fd values are in 0..63
      var stream = type == 200;
      if (protocol) {
        assert(stream == (protocol == 1)); // if stream, must be tcp
      }
      if (Sockets.backend == Sockets.BACKEND_WEBRTC) {
        assert(!stream); // If WebRTC, we can only support datagram, not stream
      }
      Sockets.fds[fd] = {
        connected: false,
        stream: stream
      };
      return fd;
    }
  function _setsockopt(d, level, optname, optval, optlen) {
      console.log('ignoring setsockopt command');
      return 0;
    }
  var ___errno=___errno_location;
  function _accept(fd, addr, addrlen) {
      // TODO: webrtc queued incoming connections, etc.
      // For now, the model is that bind does a connect, and we "accept" that one connection,
      // which has host:port the same as ours. We also return the same socket fd.
      var info = Sockets.fds[fd];
      if (!info) return -1;
      if (addr) {
        setValue(addr + Sockets.sockaddr_in_layout.sin_addr, info.addr, 'i32');
        setValue(addr + Sockets.sockaddr_in_layout.sin_port, info.port, 'i32');
        setValue(addrlen, Sockets.sockaddr_in_layout.__size__, 'i32');
      }
      return fd;
    }
  function _shutdown(fd, how) {
      var info = Sockets.fds[fd];
      if (!info) return -1;
      info.socket.close();
      Sockets.fds[fd] = null;
    }
  function _close(fildes) {
      // int close(int fildes);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
      if (FS.streams[fildes]) {
        if (FS.streams[fildes].currentEntry) {
          _free(FS.streams[fildes].currentEntry);
        }
        FS.streams[fildes] = null;
        return 0;
      } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
    }
  function _sendmsg(fd, msg, flags) {
      var info = Sockets.fds[fd];
      if (!info) return -1;
      // if we are not connected, use the address info in the message
      if (!info.connected) {
        var name = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_name))>>2)];
        assert(name, 'sendmsg on non-connected socket, and no name/address in the message');
        _connect(fd, name, HEAP32[(((msg)+(Sockets.msghdr_layout.msg_namelen))>>2)]);
      }
      var iov = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_iov))>>2)];
      var num = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_iovlen))>>2)];
      var totalSize = 0;
      for (var i = 0; i < num; i++) {
        totalSize += HEAP32[(((iov)+(8*i + 4))>>2)];
      }
      var buffer = new Uint8Array(totalSize);
      var ret = 0;
      for (var i = 0; i < num; i++) {
        var currNum = HEAP32[(((iov)+(8*i + 4))>>2)];
        if (!currNum) continue;
        var currBuf = HEAP32[(((iov)+(8*i))>>2)];
        buffer.set(HEAPU8.subarray(currBuf, currBuf+currNum), ret);
        ret += currNum;
      }
      info.sender(buffer); // send all the iovs as a single message
      return ret;
    }
  function _recv(fd, buf, len, flags) {
      var info = Sockets.fds[fd];
      if (!info) return -1;
      if (!info.hasData()) {
        ___setErrNo(ERRNO_CODES.EAGAIN); // no data, and all sockets are nonblocking, so this is the right behavior
        return -1;
      }
      var buffer = info.inQueue.shift();
      if (len < buffer.length) {
        if (info.stream) {
          // This is tcp (reliable), so if not all was read, keep it
          info.inQueue.unshift(buffer.subarray(len));
        }
        buffer = buffer.subarray(0, len);
      }
      HEAPU8.set(buffer, buf);
      return buffer.length;
    }function _recvmsg(fd, msg, flags) {
      var info = Sockets.fds[fd];
      if (!info) return -1;
      // if we are not connected, use the address info in the message
      if (!info.connected) {
        var name = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_name))>>2)];
        assert(name, 'sendmsg on non-connected socket, and no name/address in the message');
        _connect(fd, name, HEAP32[(((msg)+(Sockets.msghdr_layout.msg_namelen))>>2)]);
      }
      if (!info.hasData()) {
        ___setErrNo(ERRNO_CODES.EWOULDBLOCK);
        return -1;
      }
      var buffer = info.inQueue.shift();
      var bytes = buffer.length;
      // write source
      var name = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_name))>>2)];
      HEAP32[(((name)+(Sockets.sockaddr_in_layout.sin_addr))>>2)]=info.addr;
      HEAP16[(((name)+(Sockets.sockaddr_in_layout.sin_port))>>1)]=_htons(info.port);
      // write data
      var ret = bytes;
      var iov = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_iov))>>2)];
      var num = HEAP32[(((msg)+(Sockets.msghdr_layout.msg_iovlen))>>2)];
      var bufferPos = 0;
      for (var i = 0; i < num && bytes > 0; i++) {
        var currNum = HEAP32[(((iov)+(8*i + 4))>>2)];
        if (!currNum) continue;
        currNum = Math.min(currNum, bytes); // XXX what should happen when we partially fill a buffer..?
        bytes -= currNum;
        var currBuf = HEAP32[(((iov)+(8*i))>>2)];
        HEAPU8.set(buffer.subarray(bufferPos, bufferPos + currNum), currBuf);
        bufferPos += currNum;
      }
      if (info.stream) {
        // This is tcp (reliable), so if not all was read, keep it
        if (bufferPos < bytes) {
          info.inQueue.unshift(buffer.subarray(bufferPos));
        }
      }
      return ret;
    }
  function _select(nfds, readfds, writefds, exceptfds, timeout) {
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
        if ((info.socket.readyState == WebSocket.CLOSING || info.socket.readyState == WebSocket.CLOSED) && info.inQueue.length == 0) {
          errorCondition = -1;
          return false;
        }
        return info.hasData && info.hasData();
      }
      function canWrite(info) {
        // make sure socket exists. 
        // we do create it when the socket is connected, 
        // but other implementations may create it lazily
        if ((info.socket.readyState == WebSocket.CLOSING || info.socket.readyState == WebSocket.CLOSED)) {
          errorCondition = -1;
          return false;
        }
        return info.socket && (info.socket.readyState == info.socket.OPEN);
      }
      function checkfds(nfds, fds, can) {
        if (!fds) return 0;
        var bitsSet = 0;
        var dstLow  = 0;
        var dstHigh = 0;
        var srcLow  = HEAP32[((fds)>>2)];
        var srcHigh = HEAP32[(((fds)+(4))>>2)];
        nfds = Math.min(64, nfds); // fd sets have 64 bits
        for (var fd = 0; fd < nfds; fd++) {
          var mask = 1 << (fd % 32), int = fd < 32 ? srcLow : srcHigh;
          if (int & mask) {
            // index is in the set, check if it is ready for read
            var info = Sockets.fds[fd];
            if (info && can(info)) {
              // set bit
              fd < 32 ? (dstLow = dstLow | mask) : (dstHigh = dstHigh | mask);
              bitsSet++;
            }
          }
        }
        HEAP32[((fds)>>2)]=dstLow;
        HEAP32[(((fds)+(4))>>2)]=dstHigh;
        return bitsSet;
      }
      var totalHandles = checkfds(nfds, readfds, canRead) + checkfds(nfds, writefds, canWrite);
      if (errorCondition) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      } else {
        return totalHandles;
      }
    }
  function _fwrite(ptr, size, nitems, stream) {
      // size_t fwrite(const void *restrict ptr, size_t size, size_t nitems, FILE *restrict stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fwrite.html
      var bytesToWrite = nitems * size;
      if (bytesToWrite == 0) return 0;
      var bytesWritten = _write(stream, ptr, bytesToWrite);
      if (bytesWritten == -1) {
        if (FS.streams[stream]) FS.streams[stream].error = true;
        return 0;
      } else {
        return Math.floor(bytesWritten / size);
      }
    }
  function __reallyNegative(x) {
      return x < 0 || (x === 0 && (1/x) === -Infinity);
    }function __formatString(format, varargs) {
      var textIndex = format;
      var argIndex = 0;
      function getNextArg(type) {
        // NOTE: Explicitly ignoring type safety. Otherwise this fails:
        //       int x = 4; printf("%c\n", (char)x);
        var ret;
        if (type === 'double') {
          ret = (HEAP32[((tempDoublePtr)>>2)]=HEAP32[(((varargs)+(argIndex))>>2)],HEAP32[(((tempDoublePtr)+(4))>>2)]=HEAP32[(((varargs)+((argIndex)+(4)))>>2)],HEAPF64[(tempDoublePtr)>>3]);
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+4))>>2)]];
        } else {
          type = 'i32'; // varargs are always i32, i64, or double
          ret = HEAP32[(((varargs)+(argIndex))>>2)];
        }
        argIndex += Math.max(Runtime.getNativeFieldSize(type), Runtime.getAlignSize(type, null, true));
        return ret;
      }
      var ret = [];
      var curr, next, currArg;
      while(1) {
        var startTextIndex = textIndex;
        curr = HEAP8[(textIndex)];
        if (curr === 0) break;
        next = HEAP8[((textIndex+1)|0)];
        if (curr == 37) {
          // Handle flags.
          var flagAlwaysSigned = false;
          var flagLeftAlign = false;
          var flagAlternative = false;
          var flagZeroPad = false;
          flagsLoop: while (1) {
            switch (next) {
              case 43:
                flagAlwaysSigned = true;
                break;
              case 45:
                flagLeftAlign = true;
                break;
              case 35:
                flagAlternative = true;
                break;
              case 48:
                if (flagZeroPad) {
                  break flagsLoop;
                } else {
                  flagZeroPad = true;
                  break;
                }
              default:
                break flagsLoop;
            }
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          }
          // Handle width.
          var width = 0;
          if (next == 42) {
            width = getNextArg('i32');
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
          } else {
            while (next >= 48 && next <= 57) {
              width = width * 10 + (next - 48);
              textIndex++;
              next = HEAP8[((textIndex+1)|0)];
            }
          }
          // Handle precision.
          var precisionSet = false;
          if (next == 46) {
            var precision = 0;
            precisionSet = true;
            textIndex++;
            next = HEAP8[((textIndex+1)|0)];
            if (next == 42) {
              precision = getNextArg('i32');
              textIndex++;
            } else {
              while(1) {
                var precisionChr = HEAP8[((textIndex+1)|0)];
                if (precisionChr < 48 ||
                    precisionChr > 57) break;
                precision = precision * 10 + (precisionChr - 48);
                textIndex++;
              }
            }
            next = HEAP8[((textIndex+1)|0)];
          } else {
            var precision = 6; // Standard default.
          }
          // Handle integer sizes. WARNING: These assume a 32-bit architecture!
          var argSize;
          switch (String.fromCharCode(next)) {
            case 'h':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 104) {
                textIndex++;
                argSize = 1; // char (actually i32 in varargs)
              } else {
                argSize = 2; // short (actually i32 in varargs)
              }
              break;
            case 'l':
              var nextNext = HEAP8[((textIndex+2)|0)];
              if (nextNext == 108) {
                textIndex++;
                argSize = 8; // long long
              } else {
                argSize = 4; // long
              }
              break;
            case 'L': // long long
            case 'q': // int64_t
            case 'j': // intmax_t
              argSize = 8;
              break;
            case 'z': // size_t
            case 't': // ptrdiff_t
            case 'I': // signed ptrdiff_t or unsigned size_t
              argSize = 4;
              break;
            default:
              argSize = null;
          }
          if (argSize) textIndex++;
          next = HEAP8[((textIndex+1)|0)];
          // Handle type specifier.
          switch (String.fromCharCode(next)) {
            case 'd': case 'i': case 'u': case 'o': case 'x': case 'X': case 'p': {
              // Integer.
              var signed = next == 100 || next == 105;
              argSize = argSize || 4;
              var currArg = getNextArg('i' + (argSize * 8));
              var origArg = currArg;
              var argText;
              // Flatten i64-1 [low, high] into a (slightly rounded) double
              if (argSize == 8) {
                currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117);
              }
              // Truncate to requested size.
              if (argSize <= 4) {
                var limit = Math.pow(256, argSize) - 1;
                currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8);
              }
              // Format the number.
              var currAbsArg = Math.abs(currArg);
              var prefix = '';
              if (next == 100 || next == 105) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null); else
                argText = reSign(currArg, 8 * argSize, 1).toString(10);
              } else if (next == 117) {
                if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true); else
                argText = unSign(currArg, 8 * argSize, 1).toString(10);
                currArg = Math.abs(currArg);
              } else if (next == 111) {
                argText = (flagAlternative ? '0' : '') + currAbsArg.toString(8);
              } else if (next == 120 || next == 88) {
                prefix = flagAlternative ? '0x' : '';
                if (argSize == 8 && i64Math) {
                  if (origArg[1]) {
                    argText = (origArg[1]>>>0).toString(16);
                    var lower = (origArg[0]>>>0).toString(16);
                    while (lower.length < 8) lower = '0' + lower;
                    argText += lower;
                  } else {
                    argText = (origArg[0]>>>0).toString(16);
                  }
                } else
                if (currArg < 0) {
                  // Represent negative numbers in hex as 2's complement.
                  currArg = -currArg;
                  argText = (currAbsArg - 1).toString(16);
                  var buffer = [];
                  for (var i = 0; i < argText.length; i++) {
                    buffer.push((0xF - parseInt(argText[i], 16)).toString(16));
                  }
                  argText = buffer.join('');
                  while (argText.length < argSize * 2) argText = 'f' + argText;
                } else {
                  argText = currAbsArg.toString(16);
                }
                if (next == 88) {
                  prefix = prefix.toUpperCase();
                  argText = argText.toUpperCase();
                }
              } else if (next == 112) {
                if (currAbsArg === 0) {
                  argText = '(nil)';
                } else {
                  prefix = '0x';
                  argText = currAbsArg.toString(16);
                }
              }
              if (precisionSet) {
                while (argText.length < precision) {
                  argText = '0' + argText;
                }
              }
              // Add sign if needed
              if (flagAlwaysSigned) {
                if (currArg < 0) {
                  prefix = '-' + prefix;
                } else {
                  prefix = '+' + prefix;
                }
              }
              // Add padding.
              while (prefix.length + argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad) {
                    argText = '0' + argText;
                  } else {
                    prefix = ' ' + prefix;
                  }
                }
              }
              // Insert the result into the buffer.
              argText = prefix + argText;
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
              // Float.
              var currArg = getNextArg('double');
              var argText;
              if (isNaN(currArg)) {
                argText = 'nan';
                flagZeroPad = false;
              } else if (!isFinite(currArg)) {
                argText = (currArg < 0 ? '-' : '') + 'inf';
                flagZeroPad = false;
              } else {
                var isGeneral = false;
                var effectivePrecision = Math.min(precision, 20);
                // Convert g/G to f/F or e/E, as per:
                // http://pubs.opengroup.org/onlinepubs/9699919799/functions/printf.html
                if (next == 103 || next == 71) {
                  isGeneral = true;
                  precision = precision || 1;
                  var exponent = parseInt(currArg.toExponential(effectivePrecision).split('e')[1], 10);
                  if (precision > exponent && exponent >= -4) {
                    next = ((next == 103) ? 'f' : 'F').charCodeAt(0);
                    precision -= exponent + 1;
                  } else {
                    next = ((next == 103) ? 'e' : 'E').charCodeAt(0);
                    precision--;
                  }
                  effectivePrecision = Math.min(precision, 20);
                }
                if (next == 101 || next == 69) {
                  argText = currArg.toExponential(effectivePrecision);
                  // Make sure the exponent has at least 2 digits.
                  if (/[eE][-+]\d$/.test(argText)) {
                    argText = argText.slice(0, -1) + '0' + argText.slice(-1);
                  }
                } else if (next == 102 || next == 70) {
                  argText = currArg.toFixed(effectivePrecision);
                  if (currArg === 0 && __reallyNegative(currArg)) {
                    argText = '-' + argText;
                  }
                }
                var parts = argText.split('e');
                if (isGeneral && !flagAlternative) {
                  // Discard trailing zeros and periods.
                  while (parts[0].length > 1 && parts[0].indexOf('.') != -1 &&
                         (parts[0].slice(-1) == '0' || parts[0].slice(-1) == '.')) {
                    parts[0] = parts[0].slice(0, -1);
                  }
                } else {
                  // Make sure we have a period in alternative mode.
                  if (flagAlternative && argText.indexOf('.') == -1) parts[0] += '.';
                  // Zero pad until required precision.
                  while (precision > effectivePrecision++) parts[0] += '0';
                }
                argText = parts[0] + (parts.length > 1 ? 'e' + parts[1] : '');
                // Capitalize 'E' if needed.
                if (next == 69) argText = argText.toUpperCase();
                // Add sign.
                if (flagAlwaysSigned && currArg >= 0) {
                  argText = '+' + argText;
                }
              }
              // Add padding.
              while (argText.length < width) {
                if (flagLeftAlign) {
                  argText += ' ';
                } else {
                  if (flagZeroPad && (argText[0] == '-' || argText[0] == '+')) {
                    argText = argText[0] + '0' + argText.slice(1);
                  } else {
                    argText = (flagZeroPad ? '0' : ' ') + argText;
                  }
                }
              }
              // Adjust case.
              if (next < 97) argText = argText.toUpperCase();
              // Insert the result into the buffer.
              argText.split('').forEach(function(chr) {
                ret.push(chr.charCodeAt(0));
              });
              break;
            }
            case 's': {
              // String.
              var arg = getNextArg('i8*') || nullString;
              var argLength = _strlen(arg);
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              for (var i = 0; i < argLength; i++) {
                ret.push(HEAPU8[((arg++)|0)]);
              }
              if (flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              break;
            }
            case 'c': {
              // Character.
              if (flagLeftAlign) ret.push(getNextArg('i8'));
              while (--width > 0) {
                ret.push(32);
              }
              if (!flagLeftAlign) ret.push(getNextArg('i8'));
              break;
            }
            case 'n': {
              // Write the length written so far to the next parameter.
              var ptr = getNextArg('i32*');
              HEAP32[((ptr)>>2)]=ret.length
              break;
            }
            case '%': {
              // Literal percent sign.
              ret.push(curr);
              break;
            }
            default: {
              // Unknown specifiers remain untouched.
              for (var i = startTextIndex; i < textIndex + 2; i++) {
                ret.push(HEAP8[(i)]);
              }
            }
          }
          textIndex += 2;
          // TODO: Support a/A (hex float) and m (last error) specifiers.
          // TODO: Support %1${specifier} for arg selection.
        } else {
          ret.push(curr);
          textIndex += 1;
        }
      }
      return ret;
    }function _fprintf(stream, format, varargs) {
      // int fprintf(FILE *restrict stream, const char *restrict format, ...);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/printf.html
      var result = __formatString(format, varargs);
      var stack = Runtime.stackSave();
      var ret = _fwrite(allocate(result, 'i8', ALLOC_STACK), 1, result.length, stream);
      Runtime.stackRestore(stack);
      return ret;
    }
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 8: return PAGE_SIZE;
        case 54:
        case 56:
        case 21:
        case 61:
        case 63:
        case 22:
        case 67:
        case 23:
        case 24:
        case 25:
        case 26:
        case 27:
        case 69:
        case 28:
        case 101:
        case 70:
        case 71:
        case 29:
        case 30:
        case 199:
        case 75:
        case 76:
        case 32:
        case 43:
        case 44:
        case 80:
        case 46:
        case 47:
        case 45:
        case 48:
        case 49:
        case 42:
        case 82:
        case 33:
        case 7:
        case 108:
        case 109:
        case 107:
        case 112:
        case 119:
        case 121:
          return 200809;
        case 13:
        case 104:
        case 94:
        case 95:
        case 34:
        case 35:
        case 77:
        case 81:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 94:
        case 95:
        case 110:
        case 111:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 120:
        case 40:
        case 16:
        case 79:
        case 19:
          return -1;
        case 92:
        case 93:
        case 5:
        case 72:
        case 6:
        case 74:
        case 92:
        case 93:
        case 96:
        case 97:
        case 98:
        case 99:
        case 102:
        case 103:
        case 105:
          return 1;
        case 38:
        case 66:
        case 50:
        case 51:
        case 4:
          return 1024;
        case 15:
        case 64:
        case 41:
          return 32;
        case 55:
        case 37:
        case 17:
          return 2147483647;
        case 18:
        case 1:
          return 47839;
        case 59:
        case 57:
          return 99;
        case 68:
        case 58:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 14: return 32768;
        case 73: return 32767;
        case 39: return 16384;
        case 60: return 1000;
        case 106: return 700;
        case 52: return 256;
        case 62: return 255;
        case 2: return 100;
        case 65: return 64;
        case 36: return 20;
        case 100: return 16;
        case 20: return 6;
        case 53: return 4;
        case 10: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We need to make sure no one else allocates unfreeable memory!
      // We must control this entirely. So we don't even need to do
      // unfreeable allocations - the HEAP is ours, from STATICTOP up.
      // TODO: We could in theory slice off the top of the HEAP when
      //       sbrk gets a negative increment in |bytes|...
      var self = _sbrk;
      if (!self.called) {
        STATICTOP = alignMemoryPage(STATICTOP); // make sure we start out aligned
        self.called = true;
        _sbrk.DYNAMIC_START = STATICTOP;
      }
      var ret = STATICTOP;
      if (bytes != 0) Runtime.staticAlloc(bytes);
      return ret;  // Previous break location.
    }
  function ___gxx_personality_v0() {
    }
  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }
  function _llvm_eh_exception() {
      return HEAP32[((_llvm_eh_exception.buf)>>2)];
    }
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  function ___resumeException(ptr) {
      if (HEAP32[((_llvm_eh_exception.buf)>>2)] == 0) HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr;
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = HEAP32[((_llvm_eh_exception.buf)>>2)];
      if (throwntype == -1) throwntype = HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return tempRet0 = typeArray[i],thrown;
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return tempRet0 = throwntype,thrown;
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=type
      HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=destructor
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }
  function ___cxa_begin_catch(ptr) {
      __ZSt18uncaught_exceptionv.uncaught_exception--;
      return ptr;
    }
  function ___cxa_free_exception(ptr) {
      return _free(ptr);
    }function ___cxa_end_catch() {
      if (___cxa_end_catch.rethrown) {
        ___cxa_end_catch.rethrown = false;
        return;
      }
      // Clear state flag.
      __THREW__ = 0;
      // Clear type.
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=0
      // Call destructor if one is registered then clear it.
      var ptr = HEAP32[((_llvm_eh_exception.buf)>>2)];
      var destructor = HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)];
      if (destructor) {
        Runtime.dynCall('vi', destructor, [ptr]);
        HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=0
      }
      // Free ptr if it isn't null.
      if (ptr) {
        ___cxa_free_exception(ptr);
        HEAP32[((_llvm_eh_exception.buf)>>2)]=0
      }
    }
  function __ZNSt9exceptionD2Ev(){}
  var _environ=allocate(1, "i32*", ALLOC_STACK);var ___environ=_environ;function ___buildEnvironment(env) {
      // WARNING: Arbitrary limit!
      var MAX_ENV_VALUES = 64;
      var TOTAL_ENV_SIZE = 1024;
      // Statically allocate memory for the environment.
      var poolPtr;
      var envPtr;
      if (!___buildEnvironment.called) {
        ___buildEnvironment.called = true;
        // Set default values. Use string keys for Closure Compiler compatibility.
        ENV['USER'] = 'root';
        ENV['PATH'] = '/';
        ENV['PWD'] = '/';
        ENV['HOME'] = '/home/emscripten';
        ENV['LANG'] = 'en_US.UTF-8';
        ENV['_'] = './this.program';
        // Allocate memory.
        poolPtr = allocate(TOTAL_ENV_SIZE, 'i8', ALLOC_STATIC);
        envPtr = allocate(MAX_ENV_VALUES * 4,
                          'i8*', ALLOC_STATIC);
        HEAP32[((envPtr)>>2)]=poolPtr
        HEAP32[((_environ)>>2)]=envPtr;
      } else {
        envPtr = HEAP32[((_environ)>>2)];
        poolPtr = HEAP32[((envPtr)>>2)];
      }
      // Collect key=value lines.
      var strings = [];
      var totalSize = 0;
      for (var key in env) {
        if (typeof env[key] === 'string') {
          var line = key + '=' + env[key];
          strings.push(line);
          totalSize += line.length;
        }
      }
      if (totalSize > TOTAL_ENV_SIZE) {
        throw new Error('Environment size exceeded TOTAL_ENV_SIZE!');
      }
      // Make new.
      var ptrSize = 4;
      for (var i = 0; i < strings.length; i++) {
        var line = strings[i];
        for (var j = 0; j < line.length; j++) {
          HEAP8[(((poolPtr)+(j))|0)]=line.charCodeAt(j);
        }
        HEAP8[(((poolPtr)+(j))|0)]=0;
        HEAP32[(((envPtr)+(i * ptrSize))>>2)]=poolPtr;
        poolPtr += line.length + 1;
      }
      HEAP32[(((envPtr)+(strings.length * ptrSize))>>2)]=0;
    }var ENV={};function _getenv(name) {
      // char *getenv(const char *name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/getenv.html
      if (name === 0) return 0;
      name = Pointer_stringify(name);
      if (!ENV.hasOwnProperty(name)) return 0;
      if (_getenv.ret) _free(_getenv.ret);
      _getenv.ret = allocate(intArrayFromString(ENV[name]), 'i8', ALLOC_NORMAL);
      return _getenv.ret;
    }
  function _strchr(ptr, chr) {
      ptr--;
      do {
        ptr++;
        var val = HEAP8[(ptr)];
        if (val == chr) return ptr;
      } while (val);
      return 0;
    }
  function _strncmp(px, py, n) {
      var i = 0;
      while (i < n) {
        var x = HEAPU8[(((px)+(i))|0)];
        var y = HEAPU8[(((py)+(i))|0)];
        if (x == y && x == 0) return 0;
        if (x == 0) return -1;
        if (y == 0) return 1;
        if (x == y) {
          i ++;
          continue;
        } else {
          return x > y ? 1 : -1;
        }
      }
      return 0;
    }
  var _llvm_va_start=undefined;
  function _llvm_va_end() {}
  var _warn=undefined;
  var _vfprintf=_fprintf;
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      function ExitStatus() {
        this.name = "ExitStatus";
        this.message = "Program terminated with exit(" + status + ")";
        this.status = status;
        Module.print('Exit Status: ' + status);
      };
      ExitStatus.prototype = new Error();
      ExitStatus.prototype.constructor = ExitStatus;
      exitRuntime();
      ABORT = true;
      throw new ExitStatus();
    }function _exit(status) {
      __exit(status);
    }
  function _isspace(chr) {
      return chr in { 32: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 };
    }
  var _llvm_memset_p0i8_i64=_memset;
  var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (Browser.initted) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : console.log("warning: cannot create object URLs");
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        function getMimetype(name) {
          return {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'bmp': 'image/bmp',
            'ogg': 'audio/ogg',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg'
          }[name.substr(name.lastIndexOf('.')+1)];
        }
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/.exec(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            setTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'];
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule) {
        var ctx;
        try {
          if (useWebGL) {
            ctx = canvas.getContext('experimental-webgl', {
              alpha: false
            });
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        this.lockPointer = lockPointer;
        this.resizeCanvas = resizeCanvas;
        if (typeof this.lockPointer === 'undefined') this.lockPointer = true;
        if (typeof this.resizeCanvas === 'undefined') this.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!this.fullScreenHandlersInstalled) {
          this.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen(); 
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        Browser.updateResizeListeners();
      }};
__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___setErrNo(0);
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
___buildEnvironment(ENV);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
var FUNCTION_TABLE = [0,0,__ZNSt20bad_array_new_lengthD0Ev,0,__ZNSt9bad_allocC2Ev,0,__ZNSt9bad_allocD0Ev,0,__errx,0,_packet_filter
,0,_enet_range_coder_destroy,0,__verrx,0,_enet_range_coder_compress,0,__ZNKSt9bad_alloc4whatEv,0,__verr
,0,__vwarnx,0,__vwarn,0,__ZNSt20bad_array_new_lengthC2Ev,0,_enet_range_coder_decompress,0,_free
,0,_warn,0,__err,0,__ZNSt9bad_allocD2Ev,0,__ZNKSt20bad_array_new_length4whatEv,0,_abort,0,_malloc,0,__warnx,0];
// EMSCRIPTEN_START_FUNCS
function _jsapi_event_get_type(r1) {
  return HEAP32[r1 >> 2];
}
function _jsapi_event_get_peer(r1) {
  return HEAP32[r1 + 4 >> 2];
}
function _jsapi_event_get_channelID(r1) {
  return HEAPU8[r1 + 8 | 0];
}
function _jsapi_event_get_packet(r1) {
  return HEAP32[r1 + 16 >> 2];
}
function _jsapi_event_get_data(r1) {
  return HEAP32[r1 + 12 >> 2];
}
function _jsapi_address_get_host(r1) {
  return r1 | 0;
}
function _jsapi_address_get_port(r1) {
  return HEAPU16[r1 + 4 >> 1];
}
function _jsapi_packet_get_data(r1) {
  return HEAP32[r1 + 8 >> 2];
}
function _jsapi_packet_get_dataLength(r1) {
  return HEAP32[r1 + 12 >> 2];
}
function _jsapi_packet_set_free_callback(r1, r2) {
  HEAP32[r1 + 16 >> 2] = r2;
  return;
}
function _jsapi_host_get_receivedAddress(r1) {
  return r1 + 10348 | 0;
}
function _jsapi_host_get_peerCount(r1) {
  return HEAP32[r1 + 40 >> 2];
}
function _jsapi_host_get_channelLimit(r1) {
  return HEAP32[r1 + 44 >> 2];
}
function _jsapi_host_get_receivedData(r1) {
  return HEAP32[r1 + 10356 >> 2];
}
function _jsapi_host_get_receivedDataLength(r1) {
  return HEAP32[r1 + 10360 >> 2];
}
function _jsapi_host_get_socket(r1) {
  return HEAP32[r1 >> 2];
}
function _jsapi_peer_get_address(r1) {
  return r1 + 24 | 0;
}
function _jsapi_peer_get_data(r1) {
  return HEAP32[r1 + 32 >> 2];
}
function _jsapi_peer_get_channelCount(r1) {
  return HEAP32[r1 + 44 >> 2];
}
function _enet_initialize_with_callbacks(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = 0;
  if (r1 >>> 0 < 66304) {
    r4 = -1;
    return r4;
  }
  r1 = r2 | 0;
  r5 = HEAP32[r1 >> 2];
  do {
    if ((r5 | 0) == 0) {
      if ((HEAP32[r2 + 4 >> 2] | 0) == 0) {
        break;
      }
      r6 = HEAP32[r1 >> 2];
      if ((r6 | 0) == 0) {
        r4 = -1;
      } else {
        r7 = r6;
        r3 = 24;
        break;
      }
      return r4;
    } else {
      r7 = r5;
      r3 = 24;
    }
  } while (0);
  do {
    if (r3 == 24) {
      r5 = r2 + 4 | 0;
      if ((HEAP32[r5 >> 2] | 0) == 0) {
        r4 = -1;
        return r4;
      } else {
        HEAP32[102770] = r7;
        HEAP32[102769] = HEAP32[r5 >> 2];
        break;
      }
    }
  } while (0);
  r7 = HEAP32[r2 + 8 >> 2];
  if ((r7 | 0) != 0) {
    HEAP32[102768] = r7;
  }
  r7 = HEAP32[r2 + 12 >> 2];
  if ((r7 | 0) == 0) {
    r4 = 0;
    return r4;
  }
  HEAP32[102767] = r7;
  r4 = 0;
  return r4;
}
function _packet_filter(r1) {
  return __packet_filter(r1);
}
function _jsapi_init(r1) {
  var r2, r3;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  r3 = r2;
  if ((r1 | 0) == 0) {
    STACKTOP = r2;
    return;
  }
  r1 = r3 >> 2;
  HEAP32[r1] = HEAP32[102461];
  HEAP32[r1 + 1] = HEAP32[102462];
  HEAP32[r1 + 2] = HEAP32[102463];
  HEAP32[r1 + 3] = HEAP32[102464];
  _enet_initialize_with_callbacks(66309, r3);
  STACKTOP = r2;
  return;
}
function _jsapi_enet_host_create(r1, r2, r3, r4, r5, r6) {
  var r7, r8;
  r7 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r8 = r7;
  HEAP32[r8 >> 2] = r1;
  HEAP16[r8 + 4 >> 1] = r2 & 65535;
  r2 = _enet_host_create(r8, r3, r4, r5, r6);
  STACKTOP = r7;
  return r2;
}
function _jsapi_enet_host_create_client(r1, r2, r3, r4) {
  var r5;
  r5 = _enet_host_create(0, r1, r2, r3, r4);
  HEAP32[r5 + 10380 >> 2] = 1;
  return r5;
}
function _jsapi_enet_host_connect(r1, r2, r3, r4, r5) {
  var r6, r7;
  r6 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r7 = r6;
  HEAP32[r7 >> 2] = r2;
  HEAP16[r7 + 4 >> 1] = r3 & 65535;
  r3 = _enet_host_connect(r1, r7, r4, r5);
  STACKTOP = r6;
  return r3;
}
function _jsapi_event_new() {
  return _malloc(20);
}
function _jsapi_event_free(r1) {
  _free(r1);
  return;
}
function _enet_malloc(r1) {
  var r2;
  r2 = FUNCTION_TABLE[HEAP32[102770]](r1);
  if ((r2 | 0) != 0) {
    return r2;
  }
  FUNCTION_TABLE[HEAP32[102768]]();
  return r2;
}
function _enet_free(r1) {
  FUNCTION_TABLE[HEAP32[102769]](r1);
  return;
}
function _enet_packet_filter(r1) {
  var r2, r3;
  do {
    if ((HEAP32[r1 + 10360 >> 2] | 0) == 0) {
      r2 = 1;
    } else {
      r3 = HEAP32[102767];
      if ((r3 | 0) == 0) {
        r2 = 1;
        break;
      }
      r2 = FUNCTION_TABLE[r3](r1);
    }
  } while (0);
  return r2;
}
function _enet_range_coder_create() {
  return _enet_malloc(65536);
}
function _enet_range_coder_destroy(r1) {
  if ((r1 | 0) == 0) {
    return;
  }
  _enet_free(r1);
  return;
}
function _enet_range_coder_compress(r1, r2, r3, r4, r5, r6) {
  var r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54, r55, r56, r57, r58, r59, r60, r61, r62, r63, r64, r65, r66, r67, r68, r69, r70, r71, r72, r73, r74, r75, r76, r77, r78, r79, r80, r81, r82, r83, r84, r85, r86, r87, r88, r89, r90, r91, r92, r93;
  r7 = 0;
  r8 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r9 = r8, r10 = r9 >> 1;
  r11 = r5 + r6 | 0;
  HEAP16[r10] = 0;
  if ((r1 | 0) == 0 | (r3 | 0) == 0 | (r4 | 0) == 0) {
    r12 = 0;
    STACKTOP = r8;
    return r12;
  }
  r4 = HEAP32[r2 >> 2];
  r6 = r4 + HEAP32[r2 + 4 >> 2] | 0;
  r13 = r1, r14 = r13 >> 1;
  r15 = r1;
  r16 = (r1 + 8 | 0) >> 1;
  r17 = (r1 + 10 | 0) >> 1;
  r18 = (r1 + 12 | 0) >> 1;
  _memset(r1, 0, 16);
  HEAP16[r17] = 1;
  HEAP16[r18] = 257;
  HEAP16[r16] = 0;
  r19 = r1;
  r20 = r1;
  r21 = r1;
  r22 = 1;
  r23 = 0;
  r24 = -1;
  r25 = 0;
  r26 = r6;
  r6 = r4;
  r4 = r2 + 8 | 0;
  r2 = r3 - 1 | 0;
  r3 = r5;
  L72 : while (1) {
    if (r6 >>> 0 < r26 >>> 0) {
      r27 = r26;
      r28 = r6;
      r29 = r4;
      r30 = r2;
    } else {
      if ((r2 | 0) == 0) {
        r7 = 67;
        break;
      }
      r31 = HEAP32[r4 >> 2];
      r27 = r31 + HEAP32[r4 + 4 >> 2] | 0;
      r28 = r31;
      r29 = r4 + 8 | 0;
      r30 = r2 - 1 | 0;
    }
    r31 = r28 + 1 | 0;
    r32 = HEAP8[r28];
    r33 = HEAPU16[r10];
    r34 = (r33 << 4) + r13 | 0;
    L78 : do {
      if ((r34 | 0) == (r15 | 0)) {
        r35 = r3;
        r36 = r25;
        r37 = r24;
        r38 = r22;
        r39 = r9;
        r7 = 103;
      } else {
        r40 = r3;
        r41 = r25;
        r42 = r24;
        r43 = r22;
        r44 = r9;
        r45 = r33;
        r46 = r34;
        while (1) {
          r47 = ((r45 << 4) + r13 + 8 | 0) >> 1;
          r48 = HEAP16[r47];
          do {
            if (r48 << 16 >> 16 == 0) {
              r49 = (r43 << 4) + r13 | 0;
              HEAP8[r49 | 0] = r32;
              HEAP8[(r43 << 4) + r13 + 1 | 0] = 2;
              HEAP16[((r43 << 4) + 2 >> 1) + r14] = 2;
              r50 = ((r43 << 4) + r13 + 4 | 0) >> 1;
              HEAP16[r50] = 0;
              HEAP16[r50 + 1] = 0;
              HEAP16[r50 + 2] = 0;
              HEAP16[r50 + 3] = 0;
              HEAP16[r50 + 4] = 0;
              HEAP16[r50 + 5] = 0;
              HEAP16[r47] = (r49 - r46 | 0) >>> 4 & 65535;
              r51 = 0;
              r52 = 0;
              r53 = r49;
              r54 = r43 + 1 | 0;
            } else {
              r49 = ((r48 & 65535) + r45 << 4) + r13 | 0;
              r50 = 0;
              L84 : while (1) {
                r55 = HEAP8[r49 | 0];
                L86 : do {
                  if ((r32 & 255) < (r55 & 255)) {
                    r56 = r49;
                    while (1) {
                      r57 = r56 + 2 | 0;
                      HEAP16[r57 >> 1] = HEAP16[r57 >> 1] + 2 & 65535;
                      r58 = r56 + 4 | 0;
                      r57 = HEAP16[r58 >> 1];
                      if (r57 << 16 >> 16 == 0) {
                        r7 = 76;
                        break L84;
                      }
                      r59 = ((r57 & 65535) << 4) + r56 | 0;
                      r57 = HEAP8[r59 | 0];
                      if ((r32 & 255) < (r57 & 255)) {
                        r56 = r59;
                      } else {
                        r60 = r59;
                        r61 = r57;
                        break L86;
                      }
                    }
                  } else {
                    r60 = r49;
                    r61 = r55;
                  }
                } while (0);
                if ((r32 & 255) <= (r61 & 255)) {
                  r7 = 81;
                  break;
                }
                r62 = HEAP16[r60 + 2 >> 1] + r50 & 65535;
                r63 = r60 + 6 | 0;
                r55 = HEAP16[r63 >> 1];
                if (r55 << 16 >> 16 == 0) {
                  r7 = 80;
                  break;
                }
                r49 = ((r55 & 65535) << 4) + r60 | 0;
                r50 = r62;
              }
              if (r7 == 76) {
                r7 = 0;
                r49 = (r43 << 4) + r13 | 0;
                HEAP8[r49 | 0] = r32;
                HEAP8[(r43 << 4) + r13 + 1 | 0] = 2;
                HEAP16[((r43 << 4) + 2 >> 1) + r14] = 2;
                r55 = ((r43 << 4) + r13 + 4 | 0) >> 1;
                HEAP16[r55] = 0;
                HEAP16[r55 + 1] = 0;
                HEAP16[r55 + 2] = 0;
                HEAP16[r55 + 3] = 0;
                HEAP16[r55 + 4] = 0;
                HEAP16[r55 + 5] = 0;
                HEAP16[r58 >> 1] = (r49 - r56 | 0) >>> 4 & 65535;
                r51 = r50;
                r52 = 0;
                r53 = r49;
                r54 = r43 + 1 | 0;
                break;
              } else if (r7 == 80) {
                r7 = 0;
                r49 = (r43 << 4) + r13 | 0;
                HEAP8[r49 | 0] = r32;
                HEAP8[(r43 << 4) + r13 + 1 | 0] = 2;
                HEAP16[((r43 << 4) + 2 >> 1) + r14] = 2;
                r55 = ((r43 << 4) + r13 + 4 | 0) >> 1;
                HEAP16[r55] = 0;
                HEAP16[r55 + 1] = 0;
                HEAP16[r55 + 2] = 0;
                HEAP16[r55 + 3] = 0;
                HEAP16[r55 + 4] = 0;
                HEAP16[r55 + 5] = 0;
                HEAP16[r63 >> 1] = (r49 - r60 | 0) >>> 4 & 65535;
                r51 = r62;
                r52 = 0;
                r53 = r49;
                r54 = r43 + 1 | 0;
                break;
              } else if (r7 == 81) {
                r7 = 0;
                r49 = r60 + 1 | 0;
                r55 = HEAPU8[r49];
                r57 = r60 + 2 | 0;
                r59 = HEAP16[r57 >> 1];
                HEAP16[r57 >> 1] = r59 + 2 & 65535;
                HEAP8[r49] = HEAP8[r49] + 2 & 255;
                r51 = (r50 & 65535) - r55 + (r59 & 65535) & 65535;
                r52 = r55;
                r53 = r60;
                r54 = r43;
                break;
              }
            }
          } while (0);
          HEAP16[r44 >> 1] = (r53 - r21 | 0) >>> 4 & 65535;
          r48 = r53 + 14 | 0;
          r55 = ((r45 << 4) + r13 + 12 | 0) >> 1;
          r59 = HEAP16[r55];
          r49 = (r52 | 0) != 0;
          L98 : do {
            if (r49) {
              r57 = Math.floor((r42 >>> 0) / ((r59 & 65535) >>> 0));
              r64 = Math.imul(HEAPU16[((r45 << 4) + 10 >> 1) + r14] + (r51 & 65535) | 0, r57) + r41 | 0;
              r65 = Math.imul(r57, r52);
              r57 = r64;
              r64 = r40;
              while (1) {
                if ((r65 + r57 ^ r57) >>> 0 > 16777215) {
                  if (r65 >>> 0 > 65535) {
                    r66 = r65;
                    r67 = r57;
                    r68 = r64;
                    break L98;
                  }
                  r69 = -r57 & 65535;
                } else {
                  r69 = r65;
                }
                if (r64 >>> 0 >= r11 >>> 0) {
                  r12 = 0;
                  r7 = 135;
                  break L72;
                }
                HEAP8[r64] = r57 >>> 24 & 255;
                r65 = r69 << 8;
                r57 = r57 << 8;
                r64 = r64 + 1 | 0;
              }
            } else {
              r64 = ((r45 << 4) + r13 + 10 | 0) >> 1;
              r57 = HEAP16[r64];
              L108 : do {
                if (r57 << 16 >> 16 != 0 & (r57 & 65535) < (r59 & 65535)) {
                  r65 = Math.imul(Math.floor((r42 >>> 0) / ((r59 & 65535) >>> 0)), r57 & 65535);
                  r50 = r41;
                  r70 = r40;
                  while (1) {
                    if ((r65 + r50 ^ r50) >>> 0 > 16777215) {
                      if (r65 >>> 0 > 65535) {
                        r71 = r65;
                        r72 = r50;
                        r73 = r70;
                        break L108;
                      }
                      r74 = -r50 & 65535;
                    } else {
                      r74 = r65;
                    }
                    if (r70 >>> 0 >= r11 >>> 0) {
                      r12 = 0;
                      r7 = 136;
                      break L72;
                    }
                    HEAP8[r70] = r50 >>> 24 & 255;
                    r65 = r74 << 8;
                    r50 = r50 << 8;
                    r70 = r70 + 1 | 0;
                  }
                } else {
                  r71 = r42;
                  r72 = r41;
                  r73 = r40;
                }
              } while (0);
              HEAP16[r64] = HEAP16[r64] + 5 & 65535;
              HEAP16[r55] = HEAP16[r55] + 5 & 65535;
              r66 = r71;
              r67 = r72;
              r68 = r73;
            }
          } while (0);
          r59 = HEAP16[r55] + 2 & 65535;
          HEAP16[r55] = r59;
          if (r52 >>> 0 > 251 | (r59 & 65535) > 65280) {
            r59 = HEAP16[r47];
            if (r59 << 16 >> 16 == 0) {
              r75 = 0;
            } else {
              r75 = _enet_symbol_rescale(((r59 & 65535) + r45 << 4) + r13 | 0);
            }
            HEAP16[r55] = r75;
            r59 = (r45 << 4) + r13 + 10 | 0;
            r57 = HEAP16[r59 >> 1];
            r70 = r57 - ((r57 & 65535) >>> 1) & 65535;
            HEAP16[r59 >> 1] = r70;
            HEAP16[r55] = r70 + HEAP16[r55] & 65535;
          }
          if (r49) {
            r76 = r54;
            r77 = r66;
            r78 = r67;
            r79 = r68;
            break L78;
          }
          r70 = HEAPU16[((r45 << 4) + 14 >> 1) + r14];
          r59 = (r70 << 4) + r13 | 0;
          if ((r59 | 0) == (r15 | 0)) {
            r35 = r68;
            r36 = r67;
            r37 = r66;
            r38 = r54;
            r39 = r48;
            r7 = 103;
            break L78;
          } else {
            r40 = r68;
            r41 = r67;
            r42 = r66;
            r43 = r54;
            r44 = r48;
            r45 = r70;
            r46 = r59;
          }
        }
      }
    } while (0);
    do {
      if (r7 == 103) {
        r7 = 0;
        r34 = r32 & 255;
        r33 = HEAP16[r16];
        do {
          if (r33 << 16 >> 16 == 0) {
            r46 = (r38 << 4) + r13 | 0;
            HEAP8[r46 | 0] = r32;
            HEAP8[(r38 << 4) + r13 + 1 | 0] = 3;
            HEAP16[((r38 << 4) + 2 >> 1) + r14] = 3;
            r45 = ((r38 << 4) + r13 + 4 | 0) >> 1;
            HEAP16[r45] = 0;
            HEAP16[r45 + 1] = 0;
            HEAP16[r45 + 2] = 0;
            HEAP16[r45 + 3] = 0;
            HEAP16[r45 + 4] = 0;
            HEAP16[r45 + 5] = 0;
            HEAP16[r16] = (r46 - r19 | 0) >>> 4 & 65535;
            r80 = r34;
            r81 = 1;
            r82 = r46;
            r83 = r38 + 1 | 0;
          } else {
            r46 = ((r33 & 65535) << 4) + r15 | 0;
            r45 = r34;
            L131 : while (1) {
              r44 = HEAP8[r46 | 0];
              L133 : do {
                if ((r32 & 255) < (r44 & 255)) {
                  r84 = r46;
                  while (1) {
                    r43 = r84 + 2 | 0;
                    HEAP16[r43 >> 1] = HEAP16[r43 >> 1] + 3 & 65535;
                    r85 = r84 + 4 | 0;
                    r43 = HEAP16[r85 >> 1];
                    if (r43 << 16 >> 16 == 0) {
                      r7 = 109;
                      break L131;
                    }
                    r42 = ((r43 & 65535) << 4) + r84 | 0;
                    r43 = HEAP8[r42 | 0];
                    if ((r32 & 255) < (r43 & 255)) {
                      r84 = r42;
                    } else {
                      r86 = r42;
                      r87 = r43;
                      break L133;
                    }
                  }
                } else {
                  r86 = r46;
                  r87 = r44;
                }
              } while (0);
              if ((r32 & 255) <= (r87 & 255)) {
                r7 = 114;
                break;
              }
              r88 = HEAP16[r86 + 2 >> 1] + r45 & 65535;
              r89 = r86 + 6 | 0;
              r44 = HEAP16[r89 >> 1];
              if (r44 << 16 >> 16 == 0) {
                r7 = 113;
                break;
              }
              r46 = ((r44 & 65535) << 4) + r86 | 0;
              r45 = r88;
            }
            if (r7 == 109) {
              r7 = 0;
              r46 = (r38 << 4) + r13 | 0;
              HEAP8[r46 | 0] = r32;
              HEAP8[(r38 << 4) + r13 + 1 | 0] = 3;
              HEAP16[((r38 << 4) + 2 >> 1) + r14] = 3;
              r48 = ((r38 << 4) + r13 + 4 | 0) >> 1;
              HEAP16[r48] = 0;
              HEAP16[r48 + 1] = 0;
              HEAP16[r48 + 2] = 0;
              HEAP16[r48 + 3] = 0;
              HEAP16[r48 + 4] = 0;
              HEAP16[r48 + 5] = 0;
              HEAP16[r85 >> 1] = (r46 - r84 | 0) >>> 4 & 65535;
              r80 = r45;
              r81 = 1;
              r82 = r46;
              r83 = r38 + 1 | 0;
              break;
            } else if (r7 == 113) {
              r7 = 0;
              r46 = (r38 << 4) + r13 | 0;
              HEAP8[r46 | 0] = r32;
              HEAP8[(r38 << 4) + r13 + 1 | 0] = 3;
              HEAP16[((r38 << 4) + 2 >> 1) + r14] = 3;
              r48 = ((r38 << 4) + r13 + 4 | 0) >> 1;
              HEAP16[r48] = 0;
              HEAP16[r48 + 1] = 0;
              HEAP16[r48 + 2] = 0;
              HEAP16[r48 + 3] = 0;
              HEAP16[r48 + 4] = 0;
              HEAP16[r48 + 5] = 0;
              HEAP16[r89 >> 1] = (r46 - r86 | 0) >>> 4 & 65535;
              r80 = r88;
              r81 = 1;
              r82 = r46;
              r83 = r38 + 1 | 0;
              break;
            } else if (r7 == 114) {
              r7 = 0;
              r46 = r86 + 1 | 0;
              r48 = HEAPU8[r46];
              r49 = r86 + 2 | 0;
              r55 = HEAP16[r49 >> 1];
              HEAP16[r49 >> 1] = r55 + 3 & 65535;
              HEAP8[r46] = HEAP8[r46] + 3 & 255;
              r80 = (r45 & 65535) - r48 + (r55 & 65535) & 65535;
              r81 = r48 + 1 | 0;
              r82 = r86;
              r83 = r38;
              break;
            }
          }
        } while (0);
        HEAP16[r39 >> 1] = (r82 - r20 | 0) >>> 4 & 65535;
        r34 = Math.floor((r37 >>> 0) / (HEAPU16[r18] >>> 0));
        r33 = Math.imul(HEAPU16[r17] + (r80 & 65535) | 0, r34) + r36 | 0;
        r48 = Math.imul(r34, r81);
        r34 = r33;
        r33 = r35;
        while (1) {
          if ((r48 + r34 ^ r34) >>> 0 > 16777215) {
            if (r48 >>> 0 > 65535) {
              break;
            }
            r90 = -r34 & 65535;
          } else {
            r90 = r48;
          }
          if (r33 >>> 0 >= r11 >>> 0) {
            r12 = 0;
            r7 = 137;
            break L72;
          }
          HEAP8[r33] = r34 >>> 24 & 255;
          r48 = r90 << 8;
          r34 = r34 << 8;
          r33 = r33 + 1 | 0;
        }
        r55 = HEAP16[r18] + 3 & 65535;
        HEAP16[r18] = r55;
        if (!(r81 >>> 0 > 250 | (r55 & 65535) > 65280)) {
          r76 = r83;
          r77 = r48;
          r78 = r34;
          r79 = r33;
          break;
        }
        r55 = HEAP16[r16];
        if (r55 << 16 >> 16 == 0) {
          r91 = 0;
        } else {
          r91 = _enet_symbol_rescale(((r55 & 65535) << 4) + r15 | 0);
        }
        HEAP16[r18] = r91;
        r55 = HEAP16[r17];
        r46 = r55 - ((r55 & 65535) >>> 1) & 65535;
        HEAP16[r17] = r46;
        HEAP16[r18] = (HEAP16[r18] + 256 & 65535) + r46 & 65535;
        r76 = r83;
        r77 = r48;
        r78 = r34;
        r79 = r33;
      }
    } while (0);
    if (r23 >>> 0 > 1) {
      HEAP16[r10] = HEAP16[((HEAPU16[r10] << 4) + 14 >> 1) + r14];
      r92 = r23;
    } else {
      r92 = r23 + 1 | 0;
    }
    if (r76 >>> 0 <= 4093) {
      r22 = r76;
      r23 = r92;
      r24 = r77;
      r25 = r78;
      r26 = r27;
      r6 = r31;
      r4 = r29;
      r2 = r30;
      r3 = r79;
      continue;
    }
    _memset(r1, 0, 16);
    HEAP16[r17] = 1;
    HEAP16[r18] = 257;
    HEAP16[r16] = 0;
    HEAP16[r10] = 0;
    r22 = 1;
    r23 = 0;
    r24 = r77;
    r25 = r78;
    r26 = r27;
    r6 = r31;
    r4 = r29;
    r2 = r30;
    r3 = r79;
  }
  if (r7 == 67) {
    L165 : do {
      if ((r25 | 0) == 0) {
        r93 = r3;
      } else {
        r79 = r3;
        r30 = r25;
        while (1) {
          if (r79 >>> 0 >= r11 >>> 0) {
            r12 = 0;
            break;
          }
          r2 = r79 + 1 | 0;
          HEAP8[r79] = r30 >>> 24 & 255;
          r29 = r30 << 8;
          if ((r29 | 0) == 0) {
            r93 = r2;
            break L165;
          } else {
            r79 = r2;
            r30 = r29;
          }
        }
        STACKTOP = r8;
        return r12;
      }
    } while (0);
    r12 = r93 - r5 | 0;
    STACKTOP = r8;
    return r12;
  } else if (r7 == 135) {
    STACKTOP = r8;
    return r12;
  } else if (r7 == 136) {
    STACKTOP = r8;
    return r12;
  } else if (r7 == 137) {
    STACKTOP = r8;
    return r12;
  }
}
function _enet_symbol_rescale(r1) {
  var r2, r3, r4, r5, r6;
  r2 = 0;
  r3 = r1;
  while (1) {
    r1 = r3 + 1 | 0;
    r4 = HEAP8[r1];
    r5 = r4 - ((r4 & 255) >>> 1) & 255;
    HEAP8[r1] = r5;
    r1 = (r3 + 2 | 0) >> 1;
    HEAP16[r1] = r5 & 255;
    r5 = HEAP16[r3 + 4 >> 1];
    if (r5 << 16 >> 16 != 0) {
      r4 = _enet_symbol_rescale(((r5 & 65535) << 4) + r3 | 0);
      HEAP16[r1] = HEAP16[r1] + r4 & 65535;
    }
    r6 = HEAPU16[r1] + r2 | 0;
    r1 = HEAP16[r3 + 6 >> 1];
    if (r1 << 16 >> 16 == 0) {
      break;
    }
    r2 = r6 & 65535;
    r3 = ((r1 & 65535) << 4) + r3 | 0;
  }
  return r6 & 65535;
}
function _enet_range_coder_decompress(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54, r55, r56, r57, r58, r59, r60, r61, r62, r63, r64, r65, r66, r67, r68, r69, r70, r71, r72, r73, r74, r75, r76, r77, r78, r79, r80, r81, r82, r83, r84, r85, r86, r87, r88, r89, r90, r91, r92, r93, r94, r95, r96, r97, r98, r99, r100, r101, r102, r103, r104, r105, r106, r107, r108, r109, r110, r111, r112, r113, r114, r115, r116, r117, r118, r119, r120, r121, r122, r123, r124, r125, r126, r127, r128, r129, r130, r131, r132;
  r6 = 0;
  r7 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r8 = r7, r9 = r8 >> 1;
  r10 = r4 + r5 | 0;
  r5 = r2 + r3 | 0;
  HEAP16[r9] = 0;
  if ((r1 | 0) == 0 | (r3 | 0) == 0) {
    r11 = 0;
    STACKTOP = r7;
    return r11;
  }
  r12 = r1, r13 = r12 >> 1;
  r14 = r1;
  r15 = (r1 + 8 | 0) >> 1;
  r16 = (r1 + 10 | 0) >> 1;
  r17 = (r1 + 12 | 0) >> 1;
  _memset(r1, 0, 16);
  HEAP16[r16] = 1;
  HEAP16[r17] = 257;
  HEAP16[r15] = 0;
  if ((r3 | 0) > 0) {
    r18 = r2 + 1 | 0;
    r19 = HEAPU8[r2] << 24;
  } else {
    r18 = r2;
    r19 = 0;
  }
  if (r18 >>> 0 < r5 >>> 0) {
    r20 = r18 + 1 | 0;
    r21 = HEAPU8[r18] << 16 | r19;
  } else {
    r20 = r18;
    r21 = r19;
  }
  if (r20 >>> 0 < r5 >>> 0) {
    r22 = r20 + 1 | 0;
    r23 = HEAPU8[r20] << 8 | r21;
  } else {
    r22 = r20;
    r23 = r21;
  }
  if (r22 >>> 0 < r5 >>> 0) {
    r24 = r22 + 1 | 0;
    r25 = HEAPU8[r22] | r23;
  } else {
    r24 = r22;
    r25 = r23;
  }
  r23 = r1;
  r22 = r1;
  r21 = r1;
  r20 = r1;
  r19 = r24;
  r24 = r4;
  r18 = 0;
  r2 = 1;
  r3 = 0;
  r26 = -1;
  r27 = r25;
  L199 : while (1) {
    r25 = HEAP16[r9];
    r28 = r25 & 65535;
    L201 : do {
      if (((r28 << 4) + r12 | 0) == (r14 | 0)) {
        r29 = r27;
        r30 = r26;
        r31 = r18;
        r32 = r19;
        r33 = r25;
        r6 = 187;
      } else {
        r34 = r27;
        r35 = r26;
        r36 = r18;
        r37 = r19;
        r38 = r25;
        r39 = r28;
        L202 : while (1) {
          r40 = ((r39 << 4) + r12 + 10 | 0) >> 1;
          r41 = HEAP16[r40];
          r42 = r41 & 65535;
          L204 : do {
            if (r41 << 16 >> 16 == 0) {
              r43 = r37;
              r44 = r36;
              r45 = r35;
              r46 = r34;
            } else {
              r47 = ((r39 << 4) + r12 + 12 | 0) >> 1;
              r48 = HEAP16[r47];
              if ((r41 & 65535) >= (r48 & 65535)) {
                r43 = r37;
                r44 = r36;
                r45 = r35;
                r46 = r34;
                break;
              }
              r49 = Math.floor((r35 >>> 0) / ((r48 & 65535) >>> 0));
              r50 = Math.floor(((r34 - r36 | 0) >>> 0) / (r49 >>> 0));
              if ((r50 & 65535) >>> 0 >= r42 >>> 0) {
                break L202;
              }
              r48 = r37;
              r51 = r36;
              r52 = Math.imul(r49, r42);
              r53 = r34;
              while (1) {
                if ((r51 + r52 ^ r51) >>> 0 > 16777215) {
                  if (r52 >>> 0 > 65535) {
                    r43 = r48;
                    r44 = r51;
                    r45 = r52;
                    r46 = r53;
                    break L204;
                  }
                  r54 = -r51 & 65535;
                } else {
                  r54 = r52;
                }
                r55 = r53 << 8;
                if (r48 >>> 0 < r5 >>> 0) {
                  r56 = r48 + 1 | 0;
                  r57 = HEAPU8[r48] | r55;
                } else {
                  r56 = r48;
                  r57 = r55;
                }
                r48 = r56;
                r51 = r51 << 8;
                r52 = r54 << 8;
                r53 = r57;
              }
            }
          } while (0);
          r41 = HEAP16[((r39 << 4) + 14 >> 1) + r13];
          r53 = r41 & 65535;
          if (((r53 << 4) + r12 | 0) == (r14 | 0)) {
            r29 = r46;
            r30 = r45;
            r31 = r44;
            r32 = r43;
            r33 = r41;
            r6 = 187;
            break L201;
          } else {
            r34 = r46;
            r35 = r45;
            r36 = r44;
            r37 = r43;
            r38 = r41;
            r39 = r53;
          }
        }
        r35 = (r39 << 4) + r12 + 8 | 0;
        r53 = HEAP16[r35 >> 1];
        if (r53 << 16 >> 16 == 0) {
          r11 = 0;
          r6 = 244;
          break L199;
        }
        r41 = r50 - r42 & 65535;
        r52 = ((r53 & 65535) + r39 << 4) + r12 | 0;
        r53 = 0;
        L220 : while (1) {
          r51 = r52 + 2 | 0;
          r48 = HEAP16[r51 >> 1];
          r55 = r48 + r53 & 65535;
          r58 = r55 & 65535;
          L222 : do {
            if (r41 >>> 0 < r58 >>> 0) {
              r59 = r51;
              r60 = r48;
              r61 = r52;
              r62 = r58;
              while (1) {
                r63 = HEAP8[r61 | 0];
                r64 = r61 + 1 | 0;
                r65 = HEAP8[r64];
                r66 = r65 & 255;
                r67 = r62 - r66 | 0;
                HEAP16[r59 >> 1] = r60 + 2 & 65535;
                if ((r41 | 0) >= (r67 | 0)) {
                  break L220;
                }
                r68 = HEAP16[r61 + 4 >> 1];
                if (r68 << 16 >> 16 == 0) {
                  r11 = 0;
                  r6 = 246;
                  break L199;
                }
                r69 = r68 & 65535;
                r68 = (r69 << 4) + r61 | 0;
                r70 = (r69 << 4) + r61 + 2 | 0;
                r69 = HEAP16[r70 >> 1];
                r71 = r69 + r53 & 65535;
                r72 = r71 & 65535;
                if (r41 >>> 0 < r72 >>> 0) {
                  r59 = r70;
                  r60 = r69;
                  r61 = r68;
                  r62 = r72;
                } else {
                  r73 = r68;
                  r74 = r71;
                  break L222;
                }
              }
            } else {
              r73 = r52;
              r74 = r55;
            }
          } while (0);
          r55 = HEAP16[r73 + 6 >> 1];
          if (r55 << 16 >> 16 == 0) {
            r11 = 0;
            r6 = 245;
            break L199;
          }
          r52 = ((r55 & 65535) << 4) + r73 | 0;
          r53 = r74;
        }
        HEAP8[r64] = HEAP8[r64] + 2 & 255;
        r53 = (r61 - r20 | 0) >>> 4;
        r52 = r37;
        r41 = Math.imul(HEAPU16[r40] + (r67 & 65535) | 0, r49) + r36 | 0;
        r55 = Math.imul(r66, r49);
        r58 = r34;
        while (1) {
          if ((r41 + r55 ^ r41) >>> 0 > 16777215) {
            if (r55 >>> 0 > 65535) {
              break;
            }
            r75 = -r41 & 65535;
          } else {
            r75 = r55;
          }
          r48 = r58 << 8;
          if (r52 >>> 0 < r5 >>> 0) {
            r76 = r52 + 1 | 0;
            r77 = HEAPU8[r52] | r48;
          } else {
            r76 = r52;
            r77 = r48;
          }
          r52 = r76;
          r41 = r41 << 8;
          r55 = r75 << 8;
          r58 = r77;
        }
        r34 = r53 & 65535;
        r36 = HEAP16[r47] + 2 & 65535;
        HEAP16[r47] = r36;
        if (!((r65 & 255) > 251 | (r36 & 65535) > 65280)) {
          r78 = r52;
          r79 = r41;
          r80 = r34;
          r81 = r63;
          r82 = r2;
          r83 = r55;
          r84 = r58;
          r85 = r38;
          break;
        }
        r36 = HEAP16[r35 >> 1];
        if (r36 << 16 >> 16 == 0) {
          r86 = 0;
        } else {
          r86 = _enet_symbol_rescale(((r36 & 65535) + r39 << 4) + r12 | 0);
        }
        HEAP16[r47] = r86;
        r36 = HEAP16[r40];
        r37 = r36 - ((r36 & 65535) >>> 1) & 65535;
        HEAP16[r40] = r37;
        HEAP16[r47] = r37 + HEAP16[r47] & 65535;
        r78 = r52;
        r79 = r41;
        r80 = r34;
        r81 = r63;
        r82 = r2;
        r83 = r55;
        r84 = r58;
        r85 = r38;
        break;
      }
    } while (0);
    do {
      if (r6 == 187) {
        r6 = 0;
        r87 = Math.floor((r30 >>> 0) / (HEAPU16[r17] >>> 0));
        r28 = Math.floor(((r29 - r31 | 0) >>> 0) / (r87 >>> 0));
        r88 = HEAPU16[r16];
        if ((r28 & 65535) >>> 0 < r88 >>> 0) {
          r6 = 188;
          break L199;
        }
        r25 = r28 - r88 | 0;
        r28 = HEAP16[r15];
        do {
          if (r28 << 16 >> 16 == 0) {
            r34 = r25 & 255;
            r37 = (r2 << 4) + r12 | 0;
            HEAP8[r37 | 0] = r34;
            HEAP8[(r2 << 4) + r12 + 1 | 0] = 3;
            HEAP16[((r2 << 4) + 2 >> 1) + r13] = 3;
            r36 = ((r2 << 4) + r12 + 4 | 0) >> 1;
            HEAP16[r36] = 0;
            HEAP16[r36 + 1] = 0;
            HEAP16[r36 + 2] = 0;
            HEAP16[r36 + 3] = 0;
            HEAP16[r36 + 4] = 0;
            HEAP16[r36 + 5] = 0;
            HEAP16[r15] = (r37 - r23 | 0) >>> 4 & 65535;
            r89 = 1;
            r90 = r25;
            r91 = r34;
            r92 = r37;
            r93 = r2 + 1 | 0;
          } else {
            r37 = r25 & 65535;
            r34 = ((r28 & 65535) << 4) + r14 | 0;
            r36 = 0;
            L250 : while (1) {
              r48 = r34 + 2 | 0;
              r51 = HEAP16[r48 >> 1];
              r62 = (r51 & 65535) + r36 | 0;
              r60 = r34 | 0;
              r59 = HEAP8[r60];
              r71 = (r59 & 255) + 1 | 0;
              r68 = r71 + r62 | 0;
              r72 = r68 & 65535;
              L252 : do {
                if (r37 >>> 0 < r72 >>> 0) {
                  r69 = r48;
                  r70 = r51;
                  r94 = r60;
                  r95 = r59;
                  r96 = r34;
                  r97 = r72;
                  while (1) {
                    r98 = r96 + 1 | 0;
                    r99 = HEAPU8[r98] + 1 | 0;
                    r100 = r97 - r99 | 0;
                    HEAP16[r69 >> 1] = r70 + 3 & 65535;
                    if ((r37 | 0) >= (r100 | 0)) {
                      r6 = 204;
                      break L250;
                    }
                    r101 = r96 + 4 | 0;
                    r102 = HEAP16[r101 >> 1];
                    if (r102 << 16 >> 16 == 0) {
                      r6 = 203;
                      break L250;
                    }
                    r103 = r102 & 65535;
                    r102 = (r103 << 4) + r96 | 0;
                    r104 = (r103 << 4) + r96 + 2 | 0;
                    r103 = HEAP16[r104 >> 1];
                    r105 = (r103 & 65535) + r36 | 0;
                    r106 = r102 | 0;
                    r107 = HEAP8[r106];
                    r108 = (r107 & 255) + 1 | 0;
                    r109 = r108 + r105 | 0;
                    r110 = r109 & 65535;
                    if (r37 >>> 0 < r110 >>> 0) {
                      r69 = r104;
                      r70 = r103;
                      r94 = r106;
                      r95 = r107;
                      r96 = r102;
                      r97 = r110;
                    } else {
                      r111 = r102;
                      r112 = r105;
                      r113 = r108;
                      r114 = r109;
                      break L252;
                    }
                  }
                } else {
                  r111 = r34;
                  r112 = r62;
                  r113 = r71;
                  r114 = r68;
                }
              } while (0);
              r115 = r111 + 6 | 0;
              r68 = HEAP16[r115 >> 1];
              if (r68 << 16 >> 16 == 0) {
                r6 = 199;
                break;
              }
              r34 = ((r68 & 65535) << 4) + r111 | 0;
              r36 = r112 & 65535;
            }
            if (r6 == 199) {
              r6 = 0;
              r36 = r113 + r25 - r114 & 255;
              r34 = (r2 << 4) + r12 | 0;
              HEAP8[r34 | 0] = r36;
              HEAP8[(r2 << 4) + r12 + 1 | 0] = 3;
              HEAP16[((r2 << 4) + 2 >> 1) + r13] = 3;
              r68 = ((r2 << 4) + r12 + 4 | 0) >> 1;
              HEAP16[r68] = 0;
              HEAP16[r68 + 1] = 0;
              HEAP16[r68 + 2] = 0;
              HEAP16[r68 + 3] = 0;
              HEAP16[r68 + 4] = 0;
              HEAP16[r68 + 5] = 0;
              HEAP16[r115 >> 1] = (r34 - r111 | 0) >>> 4 & 65535;
              r89 = 1;
              r90 = r37;
              r91 = r36;
              r92 = r34;
              r93 = r2 + 1 | 0;
              break;
            } else if (r6 == 203) {
              r6 = 0;
              r34 = r25 - r100 + HEAPU8[r94] & 255;
              r36 = (r2 << 4) + r12 | 0;
              HEAP8[r36 | 0] = r34;
              HEAP8[(r2 << 4) + r12 + 1 | 0] = 3;
              HEAP16[((r2 << 4) + 2 >> 1) + r13] = 3;
              r68 = ((r2 << 4) + r12 + 4 | 0) >> 1;
              HEAP16[r68] = 0;
              HEAP16[r68 + 1] = 0;
              HEAP16[r68 + 2] = 0;
              HEAP16[r68 + 3] = 0;
              HEAP16[r68 + 4] = 0;
              HEAP16[r68 + 5] = 0;
              HEAP16[r101 >> 1] = (r36 - r96 | 0) >>> 4 & 65535;
              r89 = 1;
              r90 = r37;
              r91 = r34;
              r92 = r36;
              r93 = r2 + 1 | 0;
              break;
            } else if (r6 == 204) {
              r6 = 0;
              HEAP8[r98] = HEAP8[r98] + 3 & 255;
              r89 = r99;
              r90 = r100;
              r91 = r95;
              r92 = r96;
              r93 = r2;
              break;
            }
          }
        } while (0);
        r25 = (r92 - r22 | 0) >>> 4;
        r28 = r32;
        r38 = Math.imul(HEAPU16[r16] + (r90 & 65535) | 0, r87) + r31 | 0;
        r58 = Math.imul(r89, r87);
        r55 = r29;
        while (1) {
          if ((r38 + r58 ^ r38) >>> 0 > 16777215) {
            if (r58 >>> 0 > 65535) {
              break;
            }
            r116 = -r38 & 65535;
          } else {
            r116 = r58;
          }
          r41 = r55 << 8;
          if (r28 >>> 0 < r5 >>> 0) {
            r117 = r28 + 1 | 0;
            r118 = HEAPU8[r28] | r41;
          } else {
            r117 = r28;
            r118 = r41;
          }
          r28 = r117;
          r38 = r38 << 8;
          r58 = r116 << 8;
          r55 = r118;
        }
        r41 = r25 & 65535;
        r52 = HEAP16[r17] + 3 & 65535;
        HEAP16[r17] = r52;
        if (!(r89 >>> 0 > 250 | (r52 & 65535) > 65280)) {
          r78 = r28;
          r79 = r38;
          r80 = r41;
          r81 = r91;
          r82 = r93;
          r83 = r58;
          r84 = r55;
          r85 = r33;
          break;
        }
        r52 = HEAP16[r15];
        if (r52 << 16 >> 16 == 0) {
          r119 = 0;
        } else {
          r119 = _enet_symbol_rescale(((r52 & 65535) << 4) + r14 | 0);
        }
        HEAP16[r17] = r119;
        r52 = HEAP16[r16];
        r39 = r52 - ((r52 & 65535) >>> 1) & 65535;
        HEAP16[r16] = r39;
        HEAP16[r17] = (HEAP16[r17] + 256 & 65535) + r39 & 65535;
        r78 = r28;
        r79 = r38;
        r80 = r41;
        r81 = r91;
        r82 = r93;
        r83 = r58;
        r84 = r55;
        r85 = r33;
      }
    } while (0);
    r41 = HEAP16[r9];
    L279 : do {
      if (r41 << 16 >> 16 == r85 << 16 >> 16) {
        r120 = r82;
        r121 = r8;
      } else {
        r39 = r82;
        r52 = r8;
        r35 = r41;
        while (1) {
          r53 = r35 & 65535;
          r36 = ((r53 << 4) + r12 + 8 | 0) >> 1;
          r34 = HEAP16[r36];
          do {
            if (r34 << 16 >> 16 == 0) {
              r68 = (r39 << 4) + r12 | 0;
              HEAP8[r68 | 0] = r81;
              HEAP8[(r39 << 4) + r12 + 1 | 0] = 2;
              HEAP16[((r39 << 4) + 2 >> 1) + r13] = 2;
              r71 = ((r39 << 4) + r12 + 4 | 0) >> 1;
              HEAP16[r71] = 0;
              HEAP16[r71 + 1] = 0;
              HEAP16[r71 + 2] = 0;
              HEAP16[r71 + 3] = 0;
              HEAP16[r71 + 4] = 0;
              HEAP16[r71 + 5] = 0;
              HEAP16[r36] = (r68 - ((r53 << 4) + r12) | 0) >>> 4 & 65535;
              r122 = 0;
              r123 = r68;
              r124 = r39 + 1 | 0;
            } else {
              r68 = ((r34 & 65535) + r53 << 4) + r12 | 0;
              L285 : while (1) {
                r71 = HEAP8[r68 | 0];
                L287 : do {
                  if ((r81 & 255) < (r71 & 255)) {
                    r125 = r68;
                    while (1) {
                      r62 = r125 + 2 | 0;
                      HEAP16[r62 >> 1] = HEAP16[r62 >> 1] + 2 & 65535;
                      r126 = r125 + 4 | 0;
                      r62 = HEAP16[r126 >> 1];
                      if (r62 << 16 >> 16 == 0) {
                        r6 = 223;
                        break L285;
                      }
                      r72 = ((r62 & 65535) << 4) + r125 | 0;
                      r62 = HEAP8[r72 | 0];
                      if ((r81 & 255) < (r62 & 255)) {
                        r125 = r72;
                      } else {
                        r127 = r72;
                        r128 = r62;
                        break L287;
                      }
                    }
                  } else {
                    r127 = r68;
                    r128 = r71;
                  }
                } while (0);
                if ((r81 & 255) <= (r128 & 255)) {
                  r6 = 228;
                  break;
                }
                r129 = r127 + 6 | 0;
                r71 = HEAP16[r129 >> 1];
                if (r71 << 16 >> 16 == 0) {
                  r6 = 227;
                  break;
                }
                r68 = ((r71 & 65535) << 4) + r127 | 0;
              }
              if (r6 == 223) {
                r6 = 0;
                r68 = (r39 << 4) + r12 | 0;
                HEAP8[r68 | 0] = r81;
                HEAP8[(r39 << 4) + r12 + 1 | 0] = 2;
                HEAP16[((r39 << 4) + 2 >> 1) + r13] = 2;
                r71 = ((r39 << 4) + r12 + 4 | 0) >> 1;
                HEAP16[r71] = 0;
                HEAP16[r71 + 1] = 0;
                HEAP16[r71 + 2] = 0;
                HEAP16[r71 + 3] = 0;
                HEAP16[r71 + 4] = 0;
                HEAP16[r71 + 5] = 0;
                HEAP16[r126 >> 1] = (r68 - r125 | 0) >>> 4 & 65535;
                r122 = 0;
                r123 = r68;
                r124 = r39 + 1 | 0;
                break;
              } else if (r6 == 227) {
                r6 = 0;
                r68 = (r39 << 4) + r12 | 0;
                HEAP8[r68 | 0] = r81;
                HEAP8[(r39 << 4) + r12 + 1 | 0] = 2;
                HEAP16[((r39 << 4) + 2 >> 1) + r13] = 2;
                r71 = ((r39 << 4) + r12 + 4 | 0) >> 1;
                HEAP16[r71] = 0;
                HEAP16[r71 + 1] = 0;
                HEAP16[r71 + 2] = 0;
                HEAP16[r71 + 3] = 0;
                HEAP16[r71 + 4] = 0;
                HEAP16[r71 + 5] = 0;
                HEAP16[r129 >> 1] = (r68 - r127 | 0) >>> 4 & 65535;
                r122 = 0;
                r123 = r68;
                r124 = r39 + 1 | 0;
                break;
              } else if (r6 == 228) {
                r6 = 0;
                r68 = r127 + 1 | 0;
                r71 = HEAPU8[r68];
                r62 = r127 + 2 | 0;
                HEAP16[r62 >> 1] = HEAP16[r62 >> 1] + 2 & 65535;
                HEAP8[r68] = HEAP8[r68] + 2 & 255;
                r122 = r71;
                r123 = r127;
                r124 = r39;
                break;
              }
            }
          } while (0);
          HEAP16[r52 >> 1] = (r123 - r21 | 0) >>> 4 & 65535;
          r34 = r123 + 14 | 0;
          if ((r122 | 0) == 0) {
            r37 = (r53 << 4) + r12 + 10 | 0;
            HEAP16[r37 >> 1] = HEAP16[r37 >> 1] + 5 & 65535;
            r37 = (r53 << 4) + r12 + 12 | 0;
            HEAP16[r37 >> 1] = HEAP16[r37 >> 1] + 5 & 65535;
          }
          r37 = ((r53 << 4) + r12 + 12 | 0) >> 1;
          r71 = HEAP16[r37] + 2 & 65535;
          HEAP16[r37] = r71;
          if (r122 >>> 0 > 251 | (r71 & 65535) > 65280) {
            r71 = HEAP16[r36];
            if (r71 << 16 >> 16 == 0) {
              r130 = 0;
            } else {
              r130 = _enet_symbol_rescale(((r71 & 65535) + r53 << 4) + r12 | 0);
            }
            HEAP16[r37] = r130;
            r71 = (r53 << 4) + r12 + 10 | 0;
            r68 = HEAP16[r71 >> 1];
            r62 = r68 - ((r68 & 65535) >>> 1) & 65535;
            HEAP16[r71 >> 1] = r62;
            HEAP16[r37] = r62 + HEAP16[r37] & 65535;
          }
          r37 = HEAP16[((r53 << 4) + 14 >> 1) + r13];
          if (r37 << 16 >> 16 == r85 << 16 >> 16) {
            r120 = r124;
            r121 = r34;
            break L279;
          } else {
            r39 = r124;
            r52 = r34;
            r35 = r37;
          }
        }
      }
    } while (0);
    HEAP16[r121 >> 1] = r80;
    if (r24 >>> 0 >= r10 >>> 0) {
      r11 = 0;
      r6 = 248;
      break;
    }
    r41 = r24 + 1 | 0;
    HEAP8[r24] = r81;
    if (r3 >>> 0 > 1) {
      HEAP16[r9] = HEAP16[((HEAPU16[r9] << 4) + 14 >> 1) + r13];
      r131 = r3;
    } else {
      r131 = r3 + 1 | 0;
    }
    if (r120 >>> 0 <= 4093) {
      r19 = r78;
      r24 = r41;
      r18 = r79;
      r2 = r120;
      r3 = r131;
      r26 = r83;
      r27 = r84;
      continue;
    }
    _memset(r1, 0, 16);
    HEAP16[r16] = 1;
    HEAP16[r17] = 257;
    HEAP16[r15] = 0;
    HEAP16[r9] = 0;
    r19 = r78;
    r24 = r41;
    r18 = r79;
    r2 = 1;
    r3 = 0;
    r26 = r83;
    r27 = r84;
  }
  if (r6 == 188) {
    r84 = r32;
    r32 = r31;
    r31 = Math.imul(r88, r87);
    while (1) {
      if ((r32 + r31 ^ r32) >>> 0 > 16777215) {
        if (r31 >>> 0 > 65535) {
          break;
        }
        r132 = -r32 & 65535;
      } else {
        r132 = r31;
      }
      r84 = r84 >>> 0 < r5 >>> 0 ? r84 + 1 | 0 : r84;
      r32 = r32 << 8;
      r31 = r132 << 8;
    }
    r11 = r24 - r4 | 0;
    STACKTOP = r7;
    return r11;
  } else if (r6 == 244) {
    STACKTOP = r7;
    return r11;
  } else if (r6 == 245) {
    STACKTOP = r7;
    return r11;
  } else if (r6 == 246) {
    STACKTOP = r7;
    return r11;
  } else if (r6 == 248) {
    STACKTOP = r7;
    return r11;
  }
}
function _enet_host_compress_with_range_coder(r1) {
  var r2, r3, r4, r5, r6;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  r3 = r2, r4 = r3 >> 2;
  r5 = r3 >> 2;
  HEAP32[r5] = 0;
  HEAP32[r5 + 1] = 0;
  HEAP32[r5 + 2] = 0;
  HEAP32[r5 + 3] = 0;
  r5 = _enet_range_coder_create();
  HEAP32[r4] = r5;
  if ((r5 | 0) == 0) {
    r6 = -1;
    STACKTOP = r2;
    return r6;
  }
  HEAP32[r4 + 1] = 16;
  HEAP32[r4 + 2] = 28;
  HEAP32[r4 + 3] = 12;
  _enet_host_compress(r1, r3);
  r6 = 0;
  STACKTOP = r2;
  return r6;
}
function _enet_host_channel_limit(r1, r2) {
  var r3, r4;
  r3 = (r2 | 0) == 0;
  if (r3 | r2 >>> 0 > 255) {
    r4 = 255;
  } else {
    r4 = r3 ? 1 : r2;
  }
  HEAP32[r1 + 44 >> 2] = r4;
  return;
}
function _enet_host_bandwidth_limit(r1, r2, r3) {
  HEAP32[r1 + 12 >> 2] = r2;
  HEAP32[r1 + 16 >> 2] = r3;
  HEAP32[r1 + 32 >> 2] = 1;
  return;
}
function _enet_list_clear(r1) {
  var r2;
  r2 = r1 | 0;
  HEAP32[r1 >> 2] = r2;
  HEAP32[r1 + 4 >> 2] = r2;
  return;
}
function _enet_list_insert(r1, r2) {
  var r3, r4, r5;
  r3 = r2;
  r4 = r1 + 4 | 0;
  r5 = r2 + 4 | 0;
  HEAP32[r5 >> 2] = HEAP32[r4 >> 2];
  HEAP32[r2 >> 2] = r1;
  HEAP32[HEAP32[r5 >> 2] >> 2] = r3;
  HEAP32[r4 >> 2] = r3;
  return r3;
}
function _enet_list_remove(r1) {
  var r2, r3;
  r2 = r1 | 0;
  r3 = r1 + 4 | 0;
  HEAP32[HEAP32[r3 >> 2] >> 2] = HEAP32[r2 >> 2];
  HEAP32[HEAP32[r2 >> 2] + 4 >> 2] = HEAP32[r3 >> 2];
  return r1;
}
function _enet_list_move(r1, r2, r3) {
  var r4, r5, r6;
  r4 = r2;
  r5 = r3 >> 2;
  r6 = (r2 + 4 | 0) >> 2;
  HEAP32[HEAP32[r6] >> 2] = HEAP32[r5];
  HEAP32[HEAP32[r5] + 4 >> 2] = HEAP32[r6];
  r2 = r1 + 4 | 0;
  HEAP32[r6] = HEAP32[r2 >> 2];
  HEAP32[r5] = r1;
  HEAP32[HEAP32[r6] >> 2] = r4;
  HEAP32[r2 >> 2] = r3;
  return r4;
}
function _enet_host_create(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16;
  if (r2 >>> 0 > 4095) {
    r6 = 0;
    return r6;
  }
  r7 = _enet_malloc(10384);
  r8 = r7;
  if ((r7 | 0) == 0) {
    r6 = 0;
    return r6;
  }
  _memset(r7, 0, 10384);
  r9 = r2 * 380 & -1;
  r10 = _enet_malloc(r9);
  r11 = (r7 + 36 | 0) >> 2;
  HEAP32[r11] = r10;
  if ((r10 | 0) == 0) {
    _enet_free(r7);
    r6 = 0;
    return r6;
  }
  _memset(r10, 0, r9);
  r9 = _enet_socket_create(2);
  r10 = r7 >> 2;
  HEAP32[r10] = r9;
  L354 : do {
    if ((r9 | 0) != -1) {
      do {
        if ((r1 | 0) == 0) {
          _enet_socket_set_option(r9, 1, 1);
          _enet_socket_set_option(HEAP32[r10], 2, 1);
          _enet_socket_set_option(HEAP32[r10], 3, 262144);
          _enet_socket_set_option(HEAP32[r10], 4, 262144);
        } else {
          r12 = (_enet_socket_bind(r9, r1) | 0) < 0;
          r13 = HEAP32[r10];
          if (!r12) {
            _enet_socket_set_option(r13, 1, 1);
            _enet_socket_set_option(HEAP32[r10], 2, 1);
            _enet_socket_set_option(HEAP32[r10], 3, 262144);
            _enet_socket_set_option(HEAP32[r10], 4, 262144);
            r12 = r1;
            r14 = r7 + 4 | 0;
            r15 = HEAP32[r12 + 4 >> 2];
            HEAP32[r14 >> 2] = HEAP32[r12 >> 2];
            HEAP32[r14 + 4 >> 2] = r15;
            break;
          }
          if ((r13 | 0) == -1) {
            break L354;
          }
          _enet_socket_destroy(r13);
          break L354;
        }
      } while (0);
      r13 = (r3 | 0) == 0;
      if (r13 | r3 >>> 0 > 255) {
        r16 = 255;
      } else {
        r16 = r13 ? 1 : r3;
      }
      r13 = _time(0) + r7 | 0;
      HEAP32[r7 + 28 >> 2] = r13 << 16 | r13 >>> 16;
      HEAP32[r7 + 44 >> 2] = r16;
      HEAP32[r7 + 12 >> 2] = r4;
      HEAP32[r7 + 16 >> 2] = r5;
      HEAP32[r7 + 20 >> 2] = 0;
      HEAP32[r7 + 32 >> 2] = 0;
      HEAP32[r7 + 24 >> 2] = 1400;
      r13 = (r7 + 40 | 0) >> 2;
      HEAP32[r13] = r2;
      HEAP32[r7 + 1608 >> 2] = 0;
      r15 = (r7 + 2132 | 0) >> 2;
      HEAP32[r7 + 10348 >> 2] = 0;
      HEAP16[r7 + 10352 >> 1] = 0;
      r14 = (r7 + 10356 | 0) >> 2;
      HEAP32[r15] = 0;
      HEAP32[r15 + 1] = 0;
      HEAP32[r15 + 2] = 0;
      HEAP32[r15 + 3] = 0;
      HEAP32[r15 + 4] = 0;
      HEAP32[r15 + 5] = 0;
      HEAP32[r14] = 0;
      HEAP32[r14 + 1] = 0;
      HEAP32[r14 + 2] = 0;
      HEAP32[r14 + 3] = 0;
      HEAP32[r14 + 4] = 0;
      HEAP32[r14 + 5] = 0;
      HEAP32[r14 + 6] = 0;
      _enet_list_clear(r7 + 52 | 0);
      if ((HEAP32[r13] | 0) <= 0) {
        r6 = r8;
        return r6;
      }
      r14 = HEAP32[r11];
      while (1) {
        HEAP32[r14 + 8 >> 2] = r8;
        HEAP16[r14 + 14 >> 1] = (r14 - HEAP32[r11] | 0) / 380 & -1 & 65535;
        HEAP8[r14 + 21 | 0] = -1;
        HEAP8[r14 + 20 | 0] = -1;
        HEAP32[r14 + 32 >> 2] = 0;
        _enet_list_clear(r14 + 192 | 0);
        _enet_list_clear(r14 + 200 | 0);
        _enet_list_clear(r14 + 208 | 0);
        _enet_list_clear(r14 + 216 | 0);
        _enet_list_clear(r14 + 224 | 0);
        _enet_list_clear(r14 + 232 | 0);
        _enet_peer_reset(r14);
        r15 = r14 + 380 | 0;
        if (r15 >>> 0 < (HEAP32[r11] + (HEAP32[r13] * 380 & -1) | 0) >>> 0) {
          r14 = r15;
        } else {
          r6 = r8;
          break;
        }
      }
      return r6;
    }
  } while (0);
  _enet_free(HEAP32[r11]);
  _enet_free(r7);
  r6 = 0;
  return r6;
}
function _enet_host_destroy(r1) {
  var r2, r3, r4, r5;
  if ((r1 | 0) == 0) {
    return;
  }
  _enet_socket_destroy(HEAP32[r1 >> 2]);
  r2 = (r1 + 36 | 0) >> 2;
  r3 = r1 + 40 | 0;
  L379 : do {
    if ((HEAP32[r3 >> 2] | 0) > 0) {
      r4 = HEAP32[r2];
      while (1) {
        _enet_peer_reset(r4);
        r5 = r4 + 380 | 0;
        if (r5 >>> 0 < (HEAP32[r2] + (HEAP32[r3 >> 2] * 380 & -1) | 0) >>> 0) {
          r4 = r5;
        } else {
          break L379;
        }
      }
    }
  } while (0);
  r3 = HEAP32[r1 + 2140 >> 2];
  do {
    if ((r3 | 0) != 0) {
      r4 = HEAP32[r1 + 2152 >> 2];
      if ((r4 | 0) == 0) {
        break;
      }
      FUNCTION_TABLE[r4](r3);
    }
  } while (0);
  _enet_free(HEAP32[r2]);
  _enet_free(r1);
  return;
}
function _enet_host_connect(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r6 = r5;
  if ((r3 | 0) == 0) {
    r7 = 1;
  } else {
    r7 = r3 >>> 0 > 255 ? 255 : r3;
  }
  r3 = r1 + 36 | 0;
  r8 = HEAP32[r3 >> 2];
  r9 = r1 + 40 | 0;
  r10 = r8 + (HEAP32[r9 >> 2] * 380 & -1) | 0;
  r11 = r8;
  while (1) {
    if (r11 >>> 0 >= r10 >>> 0) {
      break;
    }
    if ((HEAP32[r11 + 36 >> 2] | 0) == 0) {
      break;
    } else {
      r11 = r11 + 380 | 0;
    }
  }
  if (r11 >>> 0 >= (HEAP32[r3 >> 2] + (HEAP32[r9 >> 2] * 380 & -1) | 0) >>> 0) {
    r12 = 0;
    STACKTOP = r5;
    return r12;
  }
  r9 = _enet_malloc(r7 * 60 & -1);
  r3 = (r11 + 40 | 0) >> 2;
  HEAP32[r3] = r9;
  if ((r9 | 0) == 0) {
    r12 = 0;
    STACKTOP = r5;
    return r12;
  }
  HEAP32[r11 + 44 >> 2] = r7;
  HEAP32[r11 + 36 >> 2] = 1;
  r9 = r2;
  r2 = r11 + 24 | 0;
  r10 = HEAP32[r9 + 4 >> 2];
  HEAP32[r2 >> 2] = HEAP32[r9 >> 2];
  HEAP32[r2 + 4 >> 2] = r10;
  r10 = r1 + 28 | 0;
  r2 = HEAP32[r10 >> 2] + 1 | 0;
  HEAP32[r10 >> 2] = r2;
  r10 = r11 + 16 | 0;
  HEAP32[r10 >> 2] = r2;
  r2 = r1 + 16 | 0;
  r9 = HEAP32[r2 >> 2];
  if ((r9 | 0) == 0) {
    HEAP32[r11 + 180 >> 2] = 32768;
  } else {
    HEAP32[r11 + 180 >> 2] = r9 >>> 16 << 12;
  }
  r9 = (r11 + 180 | 0) >> 2;
  r8 = HEAP32[r9];
  do {
    if (r8 >>> 0 < 4096) {
      HEAP32[r9] = 4096;
    } else {
      if (r8 >>> 0 <= 32768) {
        break;
      }
      HEAP32[r9] = 32768;
    }
  } while (0);
  L412 : do {
    if ((r7 | 0) > 0) {
      r8 = HEAP32[r3], r13 = r8 >> 1;
      while (1) {
        HEAP16[r13] = 0;
        HEAP16[r13 + 1] = 0;
        HEAP16[r13 + 19] = 0;
        HEAP16[r13 + 20] = 0;
        _enet_list_clear(r8 + 44 | 0);
        _enet_list_clear(r8 + 52 | 0);
        r14 = r8 + 60 | 0;
        _memset(r8 + 4 | 0, 0, 34);
        if (r14 >>> 0 < (HEAP32[r3] + (r7 * 60 & -1) | 0) >>> 0) {
          r8 = r14, r13 = r8 >> 1;
        } else {
          break L412;
        }
      }
    }
  } while (0);
  HEAP8[r6 | 0] = -126;
  HEAP8[r6 + 1 | 0] = -1;
  r3 = r6 + 4 | 0;
  tempBigInt = _htons(HEAP16[r11 + 14 >> 1]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  HEAP8[r6 + 6 | 0] = HEAP8[r11 + 21 | 0];
  HEAP8[r6 + 7 | 0] = HEAP8[r11 + 20 | 0];
  r3 = r6 + 8 | 0;
  tempBigInt = _htonl(HEAP32[r11 + 176 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 12 | 0;
  tempBigInt = _htonl(HEAP32[r9]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 16 | 0;
  tempBigInt = _htonl(r7);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 20 | 0;
  tempBigInt = _htonl(HEAP32[r1 + 12 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 24 | 0;
  tempBigInt = _htonl(HEAP32[r2 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 28 | 0;
  tempBigInt = _htonl(HEAP32[r11 + 132 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 32 | 0;
  tempBigInt = _htonl(HEAP32[r11 + 124 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 36 | 0;
  tempBigInt = _htonl(HEAP32[r11 + 128 >> 2]);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 40 | 0;
  tempBigInt = HEAP32[r10 >> 2];
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  r3 = r6 + 44 | 0;
  tempBigInt = _htonl(r4);
  HEAP8[r3] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r3 + 3 | 0] = tempBigInt & 255;
  _enet_peer_queue_outgoing_command(r11, r6, 0, 0, 0);
  r12 = r11;
  STACKTOP = r5;
  return r12;
}
function _enet_host_broadcast(r1, r2, r3) {
  var r4, r5, r6;
  r4 = r1 + 36 | 0;
  r5 = r1 + 40 | 0;
  L419 : do {
    if ((HEAP32[r5 >> 2] | 0) > 0) {
      r1 = HEAP32[r4 >> 2];
      while (1) {
        if ((HEAP32[r1 + 36 >> 2] | 0) == 5) {
          _enet_peer_send(r1, r2, r3);
        }
        r6 = r1 + 380 | 0;
        if (r6 >>> 0 < (HEAP32[r4 >> 2] + (HEAP32[r5 >> 2] * 380 & -1) | 0) >>> 0) {
          r1 = r6;
        } else {
          break L419;
        }
      }
    }
  } while (0);
  if ((HEAP32[r3 >> 2] | 0) != 0) {
    return;
  }
  _enet_packet_destroy(r3);
  return;
}
function _enet_host_compress(r1, r2) {
  var r3, r4, r5, r6;
  r3 = r1 + 2140 | 0;
  r4 = r3 | 0;
  r5 = HEAP32[r4 >> 2];
  do {
    if ((r5 | 0) != 0) {
      r6 = HEAP32[r1 + 2152 >> 2];
      if ((r6 | 0) == 0) {
        break;
      }
      FUNCTION_TABLE[r6](r5);
    }
  } while (0);
  if ((r2 | 0) == 0) {
    HEAP32[r4 >> 2] = 0;
    return;
  } else {
    r4 = r3 >> 2;
    r3 = r2 >> 2;
    HEAP32[r4] = HEAP32[r3];
    HEAP32[r4 + 1] = HEAP32[r3 + 1];
    HEAP32[r4 + 2] = HEAP32[r3 + 2];
    HEAP32[r4 + 3] = HEAP32[r3 + 3];
    return;
  }
}
function _enet_host_bandwidth_throttle(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36;
  r2 = 0;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r4 = r3;
  r5 = _enet_time_get();
  r6 = r1 + 20 | 0;
  r7 = r5 - HEAP32[r6 >> 2] | 0;
  if (r7 >>> 0 < 1e3) {
    STACKTOP = r3;
    return;
  }
  r8 = (r1 + 36 | 0) >> 2;
  r9 = (r1 + 40 | 0) >> 2;
  if ((HEAP32[r9] | 0) <= 0) {
    STACKTOP = r3;
    return;
  }
  r10 = HEAP32[r8];
  r11 = r10 + (HEAP32[r9] * 380 & -1) | 0;
  r12 = 0;
  r13 = r10;
  r10 = 0;
  while (1) {
    if ((HEAP32[r13 + 36 >> 2] - 5 | 0) >>> 0 < 2) {
      r14 = r10 + 1 | 0;
      r15 = HEAP32[r13 + 68 >> 2] + r12 | 0;
    } else {
      r14 = r10;
      r15 = r12;
    }
    r16 = r13 + 380 | 0;
    if (r16 >>> 0 < r11 >>> 0) {
      r12 = r15;
      r13 = r16;
      r10 = r14;
    } else {
      break;
    }
  }
  if ((r14 | 0) == 0) {
    STACKTOP = r3;
    return;
  }
  r10 = r1 + 16 | 0;
  r13 = HEAP32[r10 >> 2];
  if ((r13 | 0) == 0) {
    r17 = -1;
  } else {
    r17 = Math.floor((Math.imul(r13, r7) >>> 0) / 1e3);
  }
  L460 : do {
    if ((r14 | 0) != 0) {
      r13 = r15;
      r12 = r14;
      r11 = r17;
      while (1) {
        if (r13 >>> 0 < r11 >>> 0) {
          r18 = 32;
        } else {
          r18 = Math.floor((r11 << 5 >>> 0) / (r13 >>> 0));
        }
        if ((HEAP32[r9] | 0) <= 0) {
          r2 = 353;
          break;
        }
        r16 = r13;
        r19 = r12;
        r20 = r11;
        r21 = 0;
        r22 = HEAP32[r8], r23 = r22 >> 2;
        while (1) {
          do {
            if ((HEAP32[r23 + 9] - 5 | 0) >>> 0 < 2) {
              r24 = HEAP32[r23 + 12];
              if ((r24 | 0) == 0) {
                r25 = r21;
                r26 = r20;
                r27 = r19;
                r28 = r16;
                break;
              }
              r29 = r22 + 60 | 0;
              if ((HEAP32[r29 >> 2] | 0) == (r5 | 0)) {
                r25 = r21;
                r26 = r20;
                r27 = r19;
                r28 = r16;
                break;
              }
              r30 = Math.floor((Math.imul(r24, r7) >>> 0) / 1e3);
              r24 = HEAP32[r23 + 17];
              if (Math.imul(r24, r18) >>> 5 >>> 0 <= r30 >>> 0) {
                r25 = r21;
                r26 = r20;
                r27 = r19;
                r28 = r16;
                break;
              }
              r31 = Math.floor((r30 << 5 >>> 0) / (r24 >>> 0));
              r24 = (r31 | 0) == 0 ? 1 : r31;
              HEAP32[r23 + 28] = r24;
              r31 = r22 + 108 | 0;
              if (HEAP32[r31 >> 2] >>> 0 > r24 >>> 0) {
                HEAP32[r31 >> 2] = r24;
              }
              HEAP32[r29 >> 2] = r5;
              r25 = 1;
              r26 = r20 - r30 | 0;
              r27 = r19 - 1 | 0;
              r28 = r16 - r30 | 0;
            } else {
              r25 = r21;
              r26 = r20;
              r27 = r19;
              r28 = r16;
            }
          } while (0);
          r30 = r22 + 380 | 0;
          if (r30 >>> 0 < (HEAP32[r8] + (HEAP32[r9] * 380 & -1) | 0) >>> 0) {
            r16 = r28;
            r19 = r27;
            r20 = r26;
            r21 = r25;
            r22 = r30, r23 = r22 >> 2;
          } else {
            break;
          }
        }
        r32 = (r27 | 0) != 0;
        if ((r25 | 0) == 0 | r32 ^ 1) {
          r2 = 363;
          break;
        } else {
          r13 = r28;
          r12 = r27;
          r11 = r26;
        }
      }
      if (r2 == 353) {
        if ((r12 | 0) == 0) {
          break;
        }
      } else if (r2 == 363) {
        if (!r32) {
          break;
        }
      }
      if ((HEAP32[r9] | 0) <= 0) {
        break;
      }
      r11 = HEAP32[r8], r13 = r11 >> 2;
      while (1) {
        do {
          if ((HEAP32[r13 + 9] - 5 | 0) >>> 0 < 2) {
            if ((HEAP32[r13 + 15] | 0) == (r5 | 0)) {
              break;
            }
            HEAP32[r13 + 28] = r18;
            r22 = r11 + 108 | 0;
            if (HEAP32[r22 >> 2] >>> 0 <= r18 >>> 0) {
              break;
            }
            HEAP32[r22 >> 2] = r18;
          }
        } while (0);
        r22 = r11 + 380 | 0;
        if (r22 >>> 0 < (HEAP32[r8] + (HEAP32[r9] * 380 & -1) | 0) >>> 0) {
          r11 = r22, r13 = r11 >> 2;
        } else {
          break L460;
        }
      }
    }
  } while (0);
  r18 = r1 + 32 | 0;
  L492 : do {
    if ((HEAP32[r18 >> 2] | 0) != 0) {
      HEAP32[r18 >> 2] = 0;
      r32 = HEAP32[r1 + 12 >> 2];
      L494 : do {
        if ((r32 | 0) == 0 | (r14 | 0) == 0) {
          r33 = 0;
        } else {
          r2 = r14;
          r26 = r32;
          while (1) {
            r27 = Math.floor((r26 >>> 0) / (r2 >>> 0));
            if ((HEAP32[r9] | 0) <= 0) {
              break L492;
            }
            r28 = r2;
            r25 = r26;
            r7 = 0;
            r17 = HEAP32[r8];
            while (1) {
              do {
                if ((HEAP32[r17 + 36 >> 2] - 5 | 0) >>> 0 < 2) {
                  r15 = r17 + 56 | 0;
                  if ((HEAP32[r15 >> 2] | 0) == (r5 | 0)) {
                    r34 = r7;
                    r35 = r25;
                    r36 = r28;
                    break;
                  }
                  r11 = r17 + 52 | 0;
                  r13 = HEAP32[r11 >> 2];
                  if (!((r13 | 0) == 0 | r13 >>> 0 < r27 >>> 0)) {
                    r34 = r7;
                    r35 = r25;
                    r36 = r28;
                    break;
                  }
                  HEAP32[r15 >> 2] = r5;
                  r34 = 1;
                  r35 = r25 - HEAP32[r11 >> 2] | 0;
                  r36 = r28 - 1 | 0;
                } else {
                  r34 = r7;
                  r35 = r25;
                  r36 = r28;
                }
              } while (0);
              r11 = r17 + 380 | 0;
              if (r11 >>> 0 < (HEAP32[r8] + (HEAP32[r9] * 380 & -1) | 0) >>> 0) {
                r28 = r36;
                r25 = r35;
                r7 = r34;
                r17 = r11;
              } else {
                break;
              }
            }
            if ((r36 | 0) == 0 | (r34 | 0) == 0) {
              r33 = r27;
              break L494;
            } else {
              r2 = r36;
              r26 = r35;
            }
          }
        }
      } while (0);
      if ((HEAP32[r9] | 0) <= 0) {
        break;
      }
      r32 = r4 | 0;
      r26 = r4 + 1 | 0;
      r2 = r4 + 8 | 0;
      r17 = r4 + 4 | 0;
      r7 = r4 + 4 | 0;
      r25 = HEAP32[r8], r28 = r25 >> 2;
      while (1) {
        if ((HEAP32[r28 + 9] - 5 | 0) >>> 0 < 2) {
          HEAP8[r32] = -118;
          HEAP8[r26] = -1;
          tempBigInt = _htonl(HEAP32[r10 >> 2]);
          HEAP8[r2] = tempBigInt & 255;
          tempBigInt = tempBigInt >> 8;
          HEAP8[r2 + 1 | 0] = tempBigInt & 255;
          tempBigInt = tempBigInt >> 8;
          HEAP8[r2 + 2 | 0] = tempBigInt & 255;
          tempBigInt = tempBigInt >> 8;
          HEAP8[r2 + 3 | 0] = tempBigInt & 255;
          if ((HEAP32[r28 + 14] | 0) == (r5 | 0)) {
            tempBigInt = _htonl(HEAP32[r28 + 13]);
            HEAP8[r17] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r17 + 1 | 0] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r17 + 2 | 0] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r17 + 3 | 0] = tempBigInt & 255;
          } else {
            tempBigInt = _htonl(r33);
            HEAP8[r7] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r7 + 1 | 0] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r7 + 2 | 0] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r7 + 3 | 0] = tempBigInt & 255;
          }
          _enet_peer_queue_outgoing_command(r25, r4, 0, 0, 0);
        }
        r11 = r25 + 380 | 0;
        if (r11 >>> 0 < (HEAP32[r8] + (HEAP32[r9] * 380 & -1) | 0) >>> 0) {
          r25 = r11, r28 = r25 >> 2;
        } else {
          break L492;
        }
      }
    }
  } while (0);
  HEAP32[r6 >> 2] = r5;
  if ((HEAP32[r9] | 0) <= 0) {
    STACKTOP = r3;
    return;
  }
  r5 = HEAP32[r8];
  while (1) {
    HEAP32[r5 + 64 >> 2] = 0;
    HEAP32[r5 + 68 >> 2] = 0;
    r6 = r5 + 380 | 0;
    if (r6 >>> 0 < (HEAP32[r8] + (HEAP32[r9] * 380 & -1) | 0) >>> 0) {
      r5 = r6;
    } else {
      break;
    }
  }
  STACKTOP = r3;
  return;
}
function _reflect_crc(r1, r2) {
  var r3, r4, r5, r6, r7, r8;
  if ((r2 | 0) <= 0) {
    r3 = 0;
    return r3;
  }
  r4 = r2 - 1 | 0;
  r5 = r1;
  r1 = 0;
  r6 = 0;
  while (1) {
    if ((r5 & 1 | 0) == 0) {
      r7 = r1;
    } else {
      r7 = 1 << r4 - r6 | r1;
    }
    r8 = r6 + 1 | 0;
    if ((r8 | 0) == (r2 | 0)) {
      r3 = r7;
      break;
    } else {
      r5 = r5 >> 1;
      r1 = r7;
      r6 = r8;
    }
  }
  return r3;
}
function _enet_list_size(r1) {
  var r2, r3, r4, r5, r6;
  r2 = r1 | 0;
  r3 = HEAP32[r1 >> 2];
  if ((r3 | 0) == (r2 | 0)) {
    r4 = 0;
    return r4;
  } else {
    r5 = 0;
    r6 = r3;
  }
  while (1) {
    r3 = r5 + 1 | 0;
    r1 = HEAP32[r6 >> 2];
    if ((r1 | 0) == (r2 | 0)) {
      r4 = r3;
      break;
    } else {
      r5 = r3;
      r6 = r1;
    }
  }
  return r4;
}
function _enet_peer_throttle(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9;
  r3 = r1 >> 2;
  r4 = HEAP32[r3 + 38];
  r5 = HEAP32[r3 + 40];
  if (r4 >>> 0 <= r5 >>> 0) {
    HEAP32[r3 + 27] = HEAP32[r3 + 28];
    r6 = 0;
    return r6;
  }
  if (r4 >>> 0 > r2 >>> 0) {
    r7 = (r1 + 108 | 0) >> 2;
    r8 = HEAP32[r7] + HEAP32[r3 + 31] | 0;
    HEAP32[r7] = r8;
    r9 = HEAP32[r3 + 28];
    if (r8 >>> 0 <= r9 >>> 0) {
      r6 = 1;
      return r6;
    }
    HEAP32[r7] = r9;
    r6 = 1;
    return r6;
  } else {
    if (((r5 << 1) + r4 | 0) >>> 0 >= r2 >>> 0) {
      r6 = 0;
      return r6;
    }
    r2 = r1 + 108 | 0;
    r1 = HEAP32[r2 >> 2];
    r4 = HEAP32[r3 + 32];
    HEAP32[r2 >> 2] = r1 >>> 0 > r4 >>> 0 ? r1 - r4 | 0 : 0;
    r6 = -1;
    return r6;
  }
}
function _enet_packet_create(r1, r2, r3) {
  var r4, r5, r6, r7, r8;
  r4 = _enet_malloc(24), r5 = r4 >> 2;
  r6 = r4;
  if ((r4 | 0) == 0) {
    r7 = 0;
    return r7;
  }
  do {
    if ((r3 & 4 | 0) == 0) {
      if ((r2 | 0) == 0) {
        HEAP32[r5 + 2] = 0;
        break;
      }
      r8 = _enet_malloc(r2);
      HEAP32[r5 + 2] = r8;
      if ((r8 | 0) == 0) {
        _enet_free(r4);
        r7 = 0;
        return r7;
      } else {
        if ((r1 | 0) == 0) {
          break;
        }
        _memcpy(r8, r1, r2);
        break;
      }
    } else {
      HEAP32[r5 + 2] = r1;
    }
  } while (0);
  HEAP32[r5] = 0;
  HEAP32[r5 + 1] = r3;
  HEAP32[r5 + 3] = r2;
  HEAP32[r5 + 4] = 0;
  HEAP32[r5 + 5] = 0;
  r7 = r6;
  return r7;
}
function _enet_packet_destroy(r1) {
  var r2;
  if ((r1 | 0) == 0) {
    return;
  }
  r2 = HEAP32[r1 + 16 >> 2];
  if ((r2 | 0) != 0) {
    FUNCTION_TABLE[r2](r1);
  }
  do {
    if ((HEAP32[r1 + 4 >> 2] & 4 | 0) == 0) {
      r2 = HEAP32[r1 + 8 >> 2];
      if ((r2 | 0) == 0) {
        break;
      }
      _enet_free(r2);
    }
  } while (0);
  _enet_free(r1);
  return;
}
function _enet_packet_resize(r1, r2) {
  var r3, r4, r5, r6;
  r3 = (r1 + 12 | 0) >> 2;
  do {
    if (HEAP32[r3] >>> 0 < r2 >>> 0) {
      if ((HEAP32[r1 + 4 >> 2] & 4 | 0) != 0) {
        break;
      }
      r4 = _enet_malloc(r2);
      if ((r4 | 0) == 0) {
        r5 = -1;
        return r5;
      }
      r6 = (r1 + 8 | 0) >> 2;
      _memcpy(r4, HEAP32[r6], HEAP32[r3]);
      _enet_free(HEAP32[r6]);
      HEAP32[r6] = r4;
      HEAP32[r3] = r2;
      r5 = 0;
      return r5;
    }
  } while (0);
  HEAP32[r3] = r2;
  r5 = 0;
  return r5;
}
function _enet_crc32(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  if (!HEAP8[409860]) {
    _initialize_crc32();
  }
  if ((r2 | 0) == 0) {
    r3 = -1;
    r4 = r3 ^ -1;
    r5 = _htonl(r4);
    return r5;
  } else {
    r6 = -1;
    r7 = r1;
    r8 = r2;
  }
  while (1) {
    r2 = r8 - 1 | 0;
    r1 = HEAP32[r7 >> 2];
    r9 = HEAP32[r7 + 4 >> 2];
    r10 = r1 + r9 | 0;
    L603 : do {
      if ((r9 | 0) > 0) {
        r11 = r6;
        r12 = r1;
        while (1) {
          r13 = r12 + 1 | 0;
          r14 = HEAP32[((HEAPU8[r12] ^ r11 & 255) << 2) + 409992 >> 2] ^ r11 >>> 8;
          if (r13 >>> 0 < r10 >>> 0) {
            r11 = r14;
            r12 = r13;
          } else {
            r15 = r14;
            break L603;
          }
        }
      } else {
        r15 = r6;
      }
    } while (0);
    if ((r2 | 0) == 0) {
      r3 = r15;
      break;
    } else {
      r6 = r15;
      r7 = r7 + 8 | 0;
      r8 = r2;
    }
  }
  r4 = r3 ^ -1;
  r5 = _htonl(r4);
  return r5;
}
function _initialize_crc32() {
  var r1, r2, r3, r4;
  r1 = 0;
  while (1) {
    r2 = _reflect_crc(r1, 8);
    r3 = r2 << 25;
    r4 = (r2 & 128 | 0) != 0 ? r3 ^ 79764919 : r3;
    r3 = r4 << 1;
    r2 = (r4 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r2 << 1;
    r4 = (r2 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r4 << 1;
    r2 = (r4 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r2 << 1;
    r4 = (r2 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r4 << 1;
    r2 = (r4 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r2 << 1;
    r4 = (r2 | 0) < 0 ? r3 ^ 79764919 : r3;
    r3 = r4 << 1;
    r2 = _reflect_crc((r4 | 0) < 0 ? r3 ^ 79764919 : r3, 32);
    HEAP32[(r1 << 2) + 409992 >> 2] = r2;
    r2 = r1 + 1 | 0;
    if ((r2 | 0) == 256) {
      break;
    } else {
      r1 = r2;
    }
  }
  HEAP8[409860] = 1;
  return;
}
function _enet_peer_throttle_configure(r1, r2, r3, r4) {
  var r5, r6, r7;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r6 = r5;
  HEAP32[r1 + 132 >> 2] = r2;
  HEAP32[r1 + 124 >> 2] = r3;
  HEAP32[r1 + 128 >> 2] = r4;
  HEAP8[r6 | 0] = -117;
  HEAP8[r6 + 1 | 0] = -1;
  r7 = r6 + 4 | 0;
  tempBigInt = _htonl(r2);
  HEAP8[r7] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 3 | 0] = tempBigInt & 255;
  r7 = r6 + 8 | 0;
  tempBigInt = _htonl(r3);
  HEAP8[r7] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 3 | 0] = tempBigInt & 255;
  r7 = r6 + 12 | 0;
  tempBigInt = _htonl(r4);
  HEAP8[r7] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 3 | 0] = tempBigInt & 255;
  _enet_peer_queue_outgoing_command(r1, r6, 0, 0, 0);
  STACKTOP = r5;
  return;
}
function _enet_peer_queue_outgoing_command(r1, r2, r3, r4, r5) {
  var r6, r7, r8;
  r6 = _enet_malloc(84);
  r7 = r6;
  if ((r6 | 0) == 0) {
    r8 = 0;
    return r8;
  }
  _memcpy(r6 + 32 | 0, r2 | 0, 48);
  HEAP32[r6 + 24 >> 2] = r4;
  HEAP16[r6 + 28 >> 1] = r5;
  HEAP32[r6 + 80 >> 2] = r3;
  if ((r3 | 0) != 0) {
    r6 = r3 | 0;
    HEAP32[r6 >> 2] = HEAP32[r6 >> 2] + 1 | 0;
  }
  _enet_peer_setup_outgoing_command(r1, r7);
  r8 = r7;
  return r8;
}
function _enet_peer_send(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24;
  r4 = r1 >> 2;
  r5 = 0;
  r6 = STACKTOP;
  STACKTOP = STACKTOP + 56 | 0;
  r7 = r6;
  r8 = r6 + 48;
  r9 = r2 & 255;
  r10 = HEAP32[r4 + 10] >> 1;
  if ((HEAP32[r4 + 9] | 0) != 5) {
    r11 = -1;
    STACKTOP = r6;
    return r11;
  }
  if (r9 >>> 0 >= HEAP32[r4 + 11] >>> 0) {
    r11 = -1;
    STACKTOP = r6;
    return r11;
  }
  r12 = (r3 + 12 | 0) >> 2;
  r13 = HEAP32[r12];
  if (r13 >>> 0 > 1073741824) {
    r11 = -1;
    STACKTOP = r6;
    return r11;
  }
  r14 = ((HEAP32[HEAP32[r4 + 2] + 2136 >> 2] | 0) == 0 ? -28 : -32) + HEAP32[r4 + 44] | 0;
  if (r13 >>> 0 <= r14 >>> 0) {
    HEAP8[r7 + 1 | 0] = r2;
    r4 = HEAP32[r3 + 4 >> 2];
    L633 : do {
      if ((r4 & 3 | 0) == 2) {
        HEAP8[r7 | 0] = 73;
        r15 = r7 + 6 | 0;
        tempBigInt = _htons(HEAP32[r12] & 65535);
        HEAP8[r15] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r15 + 1 | 0] = tempBigInt & 255;
      } else {
        do {
          if ((r4 & 1 | 0) == 0) {
            if ((HEAP16[((r9 * 60 & -1) + 2 >> 1) + r10] | 0) == -1) {
              break;
            }
            HEAP8[r7 | 0] = 7;
            r15 = r7 + 6 | 0;
            tempBigInt = _htons(HEAP32[r12] & 65535);
            HEAP8[r15] = tempBigInt & 255;
            tempBigInt = tempBigInt >> 8;
            HEAP8[r15 + 1 | 0] = tempBigInt & 255;
            break L633;
          }
        } while (0);
        HEAP8[r7 | 0] = -122;
        r15 = r7 + 4 | 0;
        tempBigInt = _htons(HEAP32[r12] & 65535);
        HEAP8[r15] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r15 + 1 | 0] = tempBigInt & 255;
      }
    } while (0);
    r11 = ((_enet_peer_queue_outgoing_command(r1, r7, r3, 0, HEAP32[r12] & 65535) | 0) == 0) << 31 >> 31;
    STACKTOP = r6;
    return r11;
  }
  r7 = Math.floor(((r13 - 1 + r14 | 0) >>> 0) / (r14 >>> 0));
  if (r7 >>> 0 > 1048576) {
    r11 = -1;
    STACKTOP = r6;
    return r11;
  }
  do {
    if ((HEAP32[r3 + 4 >> 2] & 9 | 0) == 8) {
      r13 = HEAP16[((r9 * 60 & -1) + 2 >> 1) + r10];
      if (r13 << 16 >> 16 == -1) {
        r5 = 484;
        break;
      } else {
        r16 = 12;
        r17 = r13;
        break;
      }
    } else {
      r5 = 484;
    }
  } while (0);
  if (r5 == 484) {
    r16 = -120;
    r17 = HEAP16[((r9 * 60 & -1) >> 1) + r10];
  }
  r10 = _htons(r17 + 1 & 65535);
  _enet_list_clear(r8);
  r17 = HEAP32[r12];
  L651 : do {
    if ((r17 | 0) == 0) {
      r18 = 0;
    } else {
      r9 = r8 | 0;
      r5 = r14;
      r13 = 0;
      r4 = 0;
      r15 = r17;
      while (1) {
        r19 = r15 - r4 | 0;
        r20 = r19 >>> 0 < r5 >>> 0 ? r19 : r5;
        r19 = _enet_malloc(84);
        if ((r19 | 0) == 0) {
          break;
        }
        HEAP32[r19 + 24 >> 2] = r4;
        r21 = r20 & 65535;
        HEAP16[r19 + 28 >> 1] = r21;
        HEAP32[r19 + 80 >> 2] = r3;
        HEAP8[r19 + 32 | 0] = r16;
        HEAP8[r19 + 33 | 0] = r2;
        r22 = r19 + 36 | 0;
        tempBigInt = r10;
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        r22 = r19 + 38 | 0;
        tempBigInt = _htons(r21);
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        r22 = r19 + 40 | 0;
        tempBigInt = _htonl(r7);
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 2 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 3 | 0] = tempBigInt & 255;
        r22 = r19 + 44 | 0;
        tempBigInt = _htonl(r13);
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 2 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 3 | 0] = tempBigInt & 255;
        r22 = r19 + 48 | 0;
        tempBigInt = _htonl(HEAP32[r12]);
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 2 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 3 | 0] = tempBigInt & 255;
        r22 = r19 + 52 | 0;
        tempBigInt = _htonl(r4);
        HEAP8[r22] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 1 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 2 | 0] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r22 + 3 | 0] = tempBigInt & 255;
        _enet_list_insert(r9, r19);
        r19 = r13 + 1 | 0;
        r22 = r20 + r4 | 0;
        r21 = HEAP32[r12];
        if (r22 >>> 0 < r21 >>> 0) {
          r5 = r20;
          r13 = r19;
          r4 = r22;
          r15 = r21;
        } else {
          r18 = r19;
          break L651;
        }
      }
      r15 = r8 | 0;
      r4 = r8 | 0;
      r13 = HEAP32[r4 >> 2];
      if ((r13 | 0) == (r15 | 0)) {
        r11 = -1;
        STACKTOP = r6;
        return r11;
      } else {
        r23 = r13;
      }
      while (1) {
        _enet_free(_enet_list_remove(r23));
        r13 = HEAP32[r4 >> 2];
        if ((r13 | 0) == (r15 | 0)) {
          r11 = -1;
          break;
        } else {
          r23 = r13;
        }
      }
      STACKTOP = r6;
      return r11;
    }
  } while (0);
  r23 = r3 | 0;
  HEAP32[r23 >> 2] = HEAP32[r23 >> 2] + r18 | 0;
  r18 = r8 | 0;
  r23 = r8 | 0;
  r8 = HEAP32[r23 >> 2];
  if ((r8 | 0) == (r18 | 0)) {
    r11 = 0;
    STACKTOP = r6;
    return r11;
  } else {
    r24 = r8;
  }
  while (1) {
    _enet_peer_setup_outgoing_command(r1, _enet_list_remove(r24));
    r8 = HEAP32[r23 >> 2];
    if ((r8 | 0) == (r18 | 0)) {
      r11 = 0;
      break;
    } else {
      r24 = r8;
    }
  }
  STACKTOP = r6;
  return r11;
}
function _enet_peer_setup_outgoing_command(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11;
  r3 = 0;
  r4 = r2 + 33 | 0;
  r5 = HEAPU8[r4];
  r6 = HEAP32[r1 + 40 >> 2];
  r7 = r6 + (r5 * 60 & -1) | 0;
  r8 = r2 + 32 | 0;
  r9 = _enet_protocol_command_size(HEAP8[r8]);
  r10 = r1 + 68 | 0;
  HEAP32[r10 >> 2] = HEAPU16[r2 + 28 >> 1] + r9 + HEAP32[r10 >> 2] | 0;
  do {
    if ((HEAP8[r4] | 0) == -1) {
      r10 = r1 + 188 | 0;
      r9 = HEAP16[r10 >> 1] + 1 & 65535;
      HEAP16[r10 >> 1] = r9;
      HEAP16[r2 + 8 >> 1] = r9;
      HEAP16[r2 + 10 >> 1] = 0;
    } else {
      r9 = HEAPU8[r8];
      if ((r9 & 128 | 0) != 0) {
        r10 = (r7 | 0) >> 1;
        HEAP16[r10] = HEAP16[r10] + 1 & 65535;
        HEAP16[r6 + (r5 * 60 & -1) + 2 >> 1] = 0;
        HEAP16[r2 + 8 >> 1] = HEAP16[r10];
        HEAP16[r2 + 10 >> 1] = 0;
        break;
      }
      if ((r9 & 64 | 0) != 0) {
        r9 = r1 + 246 | 0;
        HEAP16[r9 >> 1] = HEAP16[r9 >> 1] + 1 & 65535;
        HEAP16[r2 + 8 >> 1] = 0;
        HEAP16[r2 + 10 >> 1] = 0;
        break;
      }
      if ((HEAP32[r2 + 24 >> 2] | 0) == 0) {
        r9 = r6 + (r5 * 60 & -1) + 2 | 0;
        HEAP16[r9 >> 1] = HEAP16[r9 >> 1] + 1 & 65535;
      }
      HEAP16[r2 + 8 >> 1] = HEAP16[r7 >> 1];
      HEAP16[r2 + 10 >> 1] = HEAP16[r6 + (r5 * 60 & -1) + 2 >> 1];
    }
  } while (0);
  HEAP16[r2 + 30 >> 1] = 0;
  HEAP32[r2 + 12 >> 2] = 0;
  HEAP32[r2 + 16 >> 2] = 0;
  HEAP32[r2 + 20 >> 2] = 0;
  r5 = r2 + 34 | 0;
  tempBigInt = _htons(HEAP16[r2 + 8 >> 1]);
  HEAP8[r5] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r5 + 1 | 0] = tempBigInt & 255;
  r5 = HEAP8[r8];
  r6 = r5 & 15;
  do {
    if ((r6 | 0) == 7) {
      r7 = r2 + 36 | 0;
      tempBigInt = _htons(HEAP16[r2 + 10 >> 1]);
      HEAP8[r7] = tempBigInt & 255;
      tempBigInt = tempBigInt >> 8;
      HEAP8[r7 + 1 | 0] = tempBigInt & 255;
      r3 = 522;
      break;
    } else if ((r6 | 0) == 9) {
      r7 = r2 + 36 | 0;
      tempBigInt = _htons(HEAP16[r1 + 246 >> 1]);
      HEAP8[r7] = tempBigInt & 255;
      tempBigInt = tempBigInt >> 8;
      HEAP8[r7 + 1 | 0] = tempBigInt & 255;
      r3 = 522;
      break;
    } else {
      r11 = r5;
    }
  } while (0);
  if (r3 == 522) {
    r11 = HEAP8[r8];
  }
  if (r11 << 24 >> 24 < 0) {
    _enet_list_insert(r1 + 216 | 0, r2);
    return;
  } else {
    _enet_list_insert(r1 + 224 | 0, r2);
    return;
  }
}
function _enet_peer_receive(r1, r2) {
  var r3, r4;
  r3 = r1 + 232 | 0;
  r1 = HEAP32[r3 >> 2];
  if ((r1 | 0) == (r3 | 0)) {
    r4 = 0;
    return r4;
  }
  r3 = _enet_list_remove(r1);
  if ((r2 | 0) != 0) {
    HEAP8[r2] = HEAP8[r3 + 13 | 0];
  }
  r2 = HEAP32[r3 + 72 >> 2];
  r1 = r2 | 0;
  HEAP32[r1 >> 2] = HEAP32[r1 >> 2] - 1 | 0;
  r1 = HEAP32[r3 + 68 >> 2];
  if ((r1 | 0) != 0) {
    _enet_free(r1);
  }
  _enet_free(r3);
  r4 = r2;
  return r4;
}
function _enet_peer_reset_queues(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11;
  r2 = r1 + 240 | 0;
  if ((HEAP32[r2 >> 2] | 0) != 0) {
    _enet_list_remove(r1 | 0);
    HEAP32[r2 >> 2] = 0;
  }
  r2 = r1 + 192 | 0;
  r3 = r2 | 0;
  r4 = HEAP32[r3 >> 2];
  L708 : do {
    if ((r4 | 0) != (r2 | 0)) {
      r5 = r4;
      while (1) {
        _enet_free(_enet_list_remove(r5));
        r6 = HEAP32[r3 >> 2];
        if ((r6 | 0) == (r2 | 0)) {
          break L708;
        } else {
          r5 = r6;
        }
      }
    }
  } while (0);
  _enet_peer_reset_outgoing_commands(r1 + 200 | 0);
  _enet_peer_reset_outgoing_commands(r1 + 208 | 0);
  _enet_peer_reset_outgoing_commands(r1 + 216 | 0);
  _enet_peer_reset_outgoing_commands(r1 + 224 | 0);
  _enet_peer_reset_incoming_commands(r1 + 232 | 0);
  r2 = (r1 + 40 | 0) >> 2;
  r3 = HEAP32[r2];
  if ((r3 | 0) == 0) {
    HEAP32[r2] = 0;
    r7 = r1 + 44 | 0, r8 = r7 >> 2;
    HEAP32[r8] = 0;
    return;
  }
  r4 = (r1 + 44 | 0) >> 2;
  if ((HEAP32[r4] | 0) == 0) {
    HEAP32[r2] = 0;
    r7 = r1 + 44 | 0, r8 = r7 >> 2;
    HEAP32[r8] = 0;
    return;
  }
  r5 = HEAP32[r2];
  L718 : do {
    if (r3 >>> 0 < (r5 + (HEAP32[r4] * 60 & -1) | 0) >>> 0) {
      r6 = r3;
      while (1) {
        _enet_peer_reset_incoming_commands(r6 + 44 | 0);
        _enet_peer_reset_incoming_commands(r6 + 52 | 0);
        r9 = r6 + 60 | 0;
        r10 = HEAP32[r2];
        if (r9 >>> 0 < (r10 + (HEAP32[r4] * 60 & -1) | 0) >>> 0) {
          r6 = r9;
        } else {
          r11 = r10;
          break L718;
        }
      }
    } else {
      r11 = r5;
    }
  } while (0);
  _enet_free(r11);
  HEAP32[r2] = 0;
  r7 = r1 + 44 | 0, r8 = r7 >> 2;
  HEAP32[r8] = 0;
  return;
}
function _enet_peer_reset_outgoing_commands(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = r1 | 0;
  r3 = r1 | 0;
  r1 = HEAP32[r3 >> 2];
  if ((r1 | 0) == (r2 | 0)) {
    return;
  } else {
    r4 = r1;
  }
  while (1) {
    r1 = _enet_list_remove(r4);
    r5 = r1 + 80 | 0;
    r6 = HEAP32[r5 >> 2];
    do {
      if ((r6 | 0) != 0) {
        r7 = r6 | 0;
        HEAP32[r7 >> 2] = HEAP32[r7 >> 2] - 1 | 0;
        r7 = HEAP32[r5 >> 2];
        if ((HEAP32[r7 >> 2] | 0) != 0) {
          break;
        }
        _enet_packet_destroy(r7);
      }
    } while (0);
    _enet_free(r1);
    r5 = HEAP32[r3 >> 2];
    if ((r5 | 0) == (r2 | 0)) {
      break;
    } else {
      r4 = r5;
    }
  }
  return;
}
function _enet_peer_reset_incoming_commands(r1) {
  _enet_peer_remove_incoming_commands(HEAP32[r1 >> 2], r1 | 0);
  return;
}
function _enet_peer_ping_interval(r1, r2) {
  HEAP32[r1 + 136 >> 2] = (r2 | 0) != 0 ? r2 : 500;
  return;
}
function _enet_peer_timeout(r1, r2, r3, r4) {
  HEAP32[r1 + 140 >> 2] = (r2 | 0) != 0 ? r2 : 32;
  HEAP32[r1 + 144 >> 2] = (r3 | 0) != 0 ? r3 : 5e3;
  HEAP32[r1 + 148 >> 2] = (r4 | 0) != 0 ? r4 : 3e4;
  return;
}
function _enet_protocol_command_size(r1) {
  return HEAP32[((r1 & 15) << 2) + 411016 >> 2];
}
function _enet_peer_reset(r1) {
  HEAP16[r1 + 12 >> 1] = 4095;
  HEAP32[r1 + 16 >> 2] = 0;
  HEAP32[r1 + 36 >> 2] = 0;
  _memset(r1 + 48 | 0, 0, 60);
  HEAP32[r1 + 108 >> 2] = 32;
  HEAP32[r1 + 112 >> 2] = 32;
  HEAP32[r1 + 116 >> 2] = 0;
  HEAP32[r1 + 120 >> 2] = 0;
  HEAP32[r1 + 124 >> 2] = 2;
  HEAP32[r1 + 128 >> 2] = 2;
  HEAP32[r1 + 132 >> 2] = 5e3;
  HEAP32[r1 + 136 >> 2] = 500;
  HEAP32[r1 + 140 >> 2] = 32;
  HEAP32[r1 + 144 >> 2] = 5e3;
  HEAP32[r1 + 148 >> 2] = 3e4;
  HEAP32[r1 + 152 >> 2] = 500;
  HEAP32[r1 + 156 >> 2] = 500;
  HEAP32[r1 + 160 >> 2] = 0;
  HEAP32[r1 + 164 >> 2] = 0;
  HEAP32[r1 + 168 >> 2] = 500;
  HEAP32[r1 + 172 >> 2] = 0;
  HEAP32[r1 + 176 >> 2] = HEAP32[HEAP32[r1 + 8 >> 2] + 24 >> 2];
  HEAP32[r1 + 184 >> 2] = 0;
  HEAP16[r1 + 188 >> 1] = 0;
  HEAP32[r1 + 180 >> 2] = 32768;
  _memset(r1 + 244 | 0, 0, 136);
  _enet_peer_reset_queues(r1);
  return;
}
function _enet_peer_ping(r1) {
  var r2, r3;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r3 = r2;
  if ((HEAP32[r1 + 36 >> 2] | 0) != 5) {
    STACKTOP = r2;
    return;
  }
  HEAP8[r3 | 0] = -123;
  HEAP8[r3 + 1 | 0] = -1;
  _enet_peer_queue_outgoing_command(r1, r3, 0, 0, 0);
  STACKTOP = r2;
  return;
}
function _enet_peer_disconnect_now(r1, r2) {
  var r3, r4, r5;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r4 = r3;
  r5 = HEAP32[r1 + 36 >> 2];
  if ((r5 | 0) == 0) {
    STACKTOP = r3;
    return;
  } else if (!((r5 | 0) == 9 | (r5 | 0) == 7)) {
    _enet_peer_reset_queues(r1);
    HEAP8[r4 | 0] = 68;
    HEAP8[r4 + 1 | 0] = -1;
    r5 = r4 + 4 | 0;
    tempBigInt = _htonl(r2);
    HEAP8[r5] = tempBigInt & 255;
    tempBigInt = tempBigInt >> 8;
    HEAP8[r5 + 1 | 0] = tempBigInt & 255;
    tempBigInt = tempBigInt >> 8;
    HEAP8[r5 + 2 | 0] = tempBigInt & 255;
    tempBigInt = tempBigInt >> 8;
    HEAP8[r5 + 3 | 0] = tempBigInt & 255;
    _enet_peer_queue_outgoing_command(r1, r4, 0, 0, 0);
    _enet_host_flush(HEAP32[r1 + 8 >> 2]);
  }
  _enet_peer_reset(r1);
  STACKTOP = r3;
  return;
}
function _enet_peer_disconnect(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r4 = r3;
  r5 = (r1 + 36 | 0) >> 2;
  r6 = HEAP32[r5];
  if ((r6 | 0) == 7 | (r6 | 0) == 0 | (r6 | 0) == 8 | (r6 | 0) == 9) {
    STACKTOP = r3;
    return;
  }
  _enet_peer_reset_queues(r1);
  r6 = r4 | 0;
  HEAP8[r6] = 4;
  HEAP8[r4 + 1 | 0] = -1;
  r7 = r4 + 4 | 0;
  tempBigInt = _htonl(r2);
  HEAP8[r7] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r7 + 3 | 0] = tempBigInt & 255;
  HEAP8[r6] = ((HEAP32[r5] - 5 | 0) >>> 0 < 2 ? -128 : 64) | HEAP8[r6];
  _enet_peer_queue_outgoing_command(r1, r4, 0, 0, 0);
  if ((HEAP32[r5] - 5 | 0) >>> 0 < 2) {
    HEAP32[r5] = 7;
    STACKTOP = r3;
    return;
  } else {
    _enet_host_flush(HEAP32[r1 + 8 >> 2]);
    _enet_peer_reset(r1);
    STACKTOP = r3;
    return;
  }
}
function _enet_peer_disconnect_later(r1, r2) {
  var r3, r4, r5;
  r3 = r1 + 36 | 0;
  L759 : do {
    if ((HEAP32[r3 >> 2] - 5 | 0) >>> 0 < 2) {
      r4 = r1 + 216 | 0;
      do {
        if ((HEAP32[r4 >> 2] | 0) == (r4 | 0)) {
          r5 = r1 + 224 | 0;
          if ((HEAP32[r5 >> 2] | 0) != (r5 | 0)) {
            break;
          }
          r5 = r1 + 200 | 0;
          if ((HEAP32[r5 >> 2] | 0) == (r5 | 0)) {
            break L759;
          }
        }
      } while (0);
      HEAP32[r3 >> 2] = 6;
      HEAP32[r1 + 376 >> 2] = r2;
      return;
    }
  } while (0);
  _enet_peer_disconnect(r1, r2);
  return;
}
function _enet_peer_queue_acknowledgement(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9;
  r4 = HEAPU8[r2 + 1 | 0];
  do {
    if (r4 >>> 0 < HEAP32[r1 + 44 >> 2] >>> 0) {
      r5 = r2 + 2 | 0;
      r6 = (tempInt = HEAPU8[r5] | HEAPU8[r5 + 1 | 0] << 8, tempInt << 16 >> 16);
      r5 = (r6 & 65535) >>> 12;
      r7 = HEAP16[HEAP32[r1 + 40 >> 2] + (r4 * 60 & -1) + 38 >> 1];
      r8 = ((r6 & 65535) < (r7 & 65535) ? r5 | 16 : r5) & 65535;
      r5 = (r7 & 65535) >>> 12 & 65535;
      if (r8 >>> 0 < (r5 + 7 | 0) >>> 0 | r8 >>> 0 > (r5 + 8 | 0) >>> 0) {
        break;
      } else {
        r9 = 0;
      }
      return r9;
    }
  } while (0);
  r4 = _enet_malloc(60);
  if ((r4 | 0) == 0) {
    r9 = 0;
    return r9;
  }
  r5 = r1 + 68 | 0;
  HEAP32[r5 >> 2] = HEAP32[r5 >> 2] + 8 | 0;
  HEAP32[r4 + 8 >> 2] = r3 & 65535;
  _memcpy(r4 + 12 | 0, r2 | 0, 48);
  _enet_list_insert(r1 + 192 | 0, r4);
  r9 = r4;
  return r9;
}
function _enet_peer_dispatch_incoming_unreliable_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21;
  r3 = r2 + 52 | 0;
  r4 = (r3 | 0) >> 2;
  r5 = HEAP32[r4];
  if ((r5 | 0) == (r3 | 0)) {
    r6 = r5;
    r7 = HEAP32[r4];
    _enet_peer_remove_incoming_commands(r7, r6);
    return;
  }
  r8 = r2 + 38 | 0;
  r9 = r2 + 40 | 0;
  r2 = r1 + 232 | 0;
  r10 = r1 + 240 | 0;
  r11 = r1 + 8 | 0;
  r12 = r1;
  r13 = r5;
  r14 = r5;
  r15 = r5;
  L781 : while (1) {
    r5 = r14;
    do {
      if ((HEAP8[r14 + 12 | 0] & 15) << 24 >> 24 == 9) {
        r16 = r15;
        r17 = r13;
      } else {
        if ((HEAP16[r14 + 8 >> 1] | 0) != (HEAP16[r8 >> 1] | 0)) {
          r18 = r13;
          r19 = r14;
          r20 = r15;
          break L781;
        }
        if ((HEAP32[r14 + 64 >> 2] | 0) == 0) {
          HEAP16[r9 >> 1] = HEAP16[r5 + 10 >> 1];
          r16 = r15;
          r17 = r13;
          break;
        }
        if ((r13 | 0) == (r14 | 0)) {
          r16 = r15;
          r17 = HEAP32[r14 >> 2];
          break;
        }
        _enet_list_move(r2, r13, HEAP32[r14 + 4 >> 2]);
        if ((HEAP32[r10 >> 2] | 0) == 0) {
          _enet_list_insert(HEAP32[r11 >> 2] + 52 | 0, r12);
          HEAP32[r10 >> 2] = 1;
        }
        r21 = HEAP32[r14 >> 2];
        r16 = r21;
        r17 = r21;
      }
    } while (0);
    r5 = HEAP32[r14 >> 2];
    if ((r5 | 0) == (r3 | 0)) {
      r18 = r17;
      r19 = r5;
      r20 = r16;
      break;
    } else {
      r13 = r17;
      r14 = r5;
      r15 = r16;
    }
  }
  if ((r18 | 0) == (r19 | 0)) {
    r6 = r20;
    r7 = HEAP32[r4];
    _enet_peer_remove_incoming_commands(r7, r6);
    return;
  }
  _enet_list_move(r1 + 232 | 0, r18, HEAP32[r19 + 4 >> 2]);
  r18 = r1 + 240 | 0;
  if ((HEAP32[r18 >> 2] | 0) == 0) {
    _enet_list_insert(HEAP32[r1 + 8 >> 2] + 52 | 0, r1);
    HEAP32[r18 >> 2] = 1;
  }
  r6 = HEAP32[r19 >> 2];
  r7 = HEAP32[r4];
  _enet_peer_remove_incoming_commands(r7, r6);
  return;
}
function _enet_peer_remove_incoming_commands(r1, r2) {
  var r3, r4, r5, r6;
  if ((r1 | 0) == (r2 | 0)) {
    return;
  } else {
    r3 = r1;
  }
  while (1) {
    r1 = HEAP32[r3 >> 2];
    _enet_list_remove(r3);
    r4 = r3 + 72 | 0;
    r5 = HEAP32[r4 >> 2];
    do {
      if ((r5 | 0) != 0) {
        r6 = r5 | 0;
        HEAP32[r6 >> 2] = HEAP32[r6 >> 2] - 1 | 0;
        r6 = HEAP32[r4 >> 2];
        if ((HEAP32[r6 >> 2] | 0) != 0) {
          break;
        }
        _enet_packet_destroy(r6);
      }
    } while (0);
    r4 = HEAP32[r3 + 68 >> 2];
    if ((r4 | 0) != 0) {
      _enet_free(r4);
    }
    _enet_free(r3);
    if ((r1 | 0) == (r2 | 0)) {
      break;
    } else {
      r3 = r1;
    }
  }
  return;
}
function _enet_peer_dispatch_incoming_reliable_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10;
  r3 = r2 + 44 | 0;
  r4 = (r3 | 0) >> 2;
  r5 = HEAP32[r4];
  L818 : do {
    if ((r5 | 0) == (r3 | 0)) {
      r6 = r5;
    } else {
      r7 = (r2 + 38 | 0) >> 1;
      r8 = r5;
      while (1) {
        if ((HEAP32[r8 + 64 >> 2] | 0) != 0) {
          r6 = r8;
          break L818;
        }
        r9 = HEAP16[r8 + 8 >> 1];
        if (r9 << 16 >> 16 != (HEAP16[r7] + 1 & 65535) << 16 >> 16) {
          r6 = r8;
          break L818;
        }
        HEAP16[r7] = r9;
        r10 = HEAP32[r8 + 60 >> 2];
        if ((r10 | 0) != 0) {
          HEAP16[r7] = (r9 & 65535) + r10 + 65535 & 65535;
        }
        r10 = HEAP32[r8 >> 2];
        if ((r10 | 0) == (r3 | 0)) {
          r6 = r10;
          break L818;
        } else {
          r8 = r10;
        }
      }
    }
  } while (0);
  if ((r6 | 0) == (HEAP32[r4] | 0)) {
    return;
  }
  HEAP16[r2 + 40 >> 1] = 0;
  _enet_list_move(r1 + 232 | 0, HEAP32[r4], HEAP32[r6 + 4 >> 2]);
  r6 = r1 + 240 | 0;
  if ((HEAP32[r6 >> 2] | 0) == 0) {
    _enet_list_insert(HEAP32[r1 + 8 >> 2] + 52 | 0, r1);
    HEAP32[r6 >> 2] = 1;
  }
  _enet_peer_dispatch_incoming_unreliable_commands(r1, r2);
  return;
}
function _enet_peer_queue_incoming_command(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26;
  r5 = 0;
  r6 = HEAPU8[r2 + 1 | 0];
  r7 = HEAP32[r1 + 40 >> 2];
  r8 = r7 + (r6 * 60 & -1) | 0;
  L836 : do {
    if ((HEAP32[r1 + 36 >> 2] | 0) == 6) {
      r5 = 685;
    } else {
      r9 = r2 | 0;
      if ((HEAP8[r9] & 15) << 24 >> 24 == 9) {
        r10 = 0;
      } else {
        r11 = r2 + 2 | 0;
        r12 = (tempInt = HEAPU8[r11] | HEAPU8[r11 + 1 | 0] << 8, tempInt << 16 >> 16);
        r11 = (r12 & 65535) >>> 12;
        r13 = HEAP16[r7 + (r6 * 60 & -1) + 38 >> 1];
        r14 = (r13 & 65535) >>> 12;
        r15 = (r12 & 65535) < (r13 & 65535) ? r11 | 16 : r11;
        if ((r15 & 65535) < (r14 & 65535)) {
          r5 = 685;
          break;
        }
        if ((r15 & 65535) >>> 0 < ((r14 & 65535) + 7 | 0) >>> 0) {
          r10 = r12 & 65535;
        } else {
          r5 = 685;
          break;
        }
      }
      r12 = HEAP8[r9] & 15;
      L842 : do {
        if ((r12 | 0) == 7 | (r12 | 0) == 12) {
          r14 = r2 + 4 | 0;
          r15 = _htons((tempInt = HEAPU8[r14] | HEAPU8[r14 + 1 | 0] << 8, tempInt << 16 >> 16));
          r14 = r7 + (r6 * 60 & -1) + 38 | 0;
          if ((r10 | 0) == (HEAPU16[r14 >> 1] | 0)) {
            if ((r15 & 65535) <= HEAPU16[r7 + (r6 * 60 & -1) + 40 >> 1]) {
              r5 = 685;
              break L836;
            }
          }
          r11 = r7 + (r6 * 60 & -1) + 52 | 0;
          r13 = HEAP32[r7 + (r6 * 60 & -1) + 56 >> 2];
          if ((r13 | 0) == (r11 | 0)) {
            r16 = r13;
            r17 = r15;
            break;
          }
          r18 = (HEAP8[r9] & 15) << 24 >> 24 == 9;
          r19 = r13;
          L848 : while (1) {
            r13 = r19;
            do {
              if (!r18) {
                r20 = HEAP16[r14 >> 1];
                r21 = r19 + 8 | 0;
                r22 = HEAPU16[r21 >> 1] < (r20 & 65535);
                if (r10 >>> 0 < (r20 & 65535) >>> 0) {
                  if (!r22) {
                    r16 = r19;
                    r17 = r15;
                    break L842;
                  }
                } else {
                  if (r22) {
                    break;
                  }
                }
                r22 = HEAPU16[r21 >> 1];
                if (r22 >>> 0 < r10 >>> 0) {
                  r16 = r19;
                  r17 = r15;
                  break L842;
                }
                if (r22 >>> 0 > r10 >>> 0) {
                  break;
                }
                r23 = HEAP16[r13 + 10 >> 1];
                if ((r23 & 65535) <= (r15 & 65535)) {
                  break L848;
                }
              }
            } while (0);
            r13 = HEAP32[r19 + 4 >> 2];
            if ((r13 | 0) == (r11 | 0)) {
              r16 = r13;
              r17 = r15;
              break L842;
            } else {
              r19 = r13;
            }
          }
          if ((r23 & 65535) < (r15 & 65535)) {
            r16 = r19;
            r17 = r15;
          } else {
            r5 = 685;
            break L836;
          }
        } else if ((r12 | 0) == 9) {
          r16 = r7 + (r6 * 60 & -1) + 52 | 0;
          r17 = 0;
        } else if ((r12 | 0) == 8 | (r12 | 0) == 6) {
          r11 = r7 + (r6 * 60 & -1) + 38 | 0;
          if ((r10 | 0) == (HEAPU16[r11 >> 1] | 0)) {
            r5 = 685;
            break L836;
          }
          r14 = r7 + (r6 * 60 & -1) + 44 | 0;
          r18 = HEAP32[r7 + (r6 * 60 & -1) + 48 >> 2];
          if ((r18 | 0) == (r14 | 0)) {
            r16 = r18;
            r17 = 0;
            break;
          }
          r13 = HEAP16[r11 >> 1];
          r11 = r10 >>> 0 < (r13 & 65535) >>> 0;
          r22 = r18;
          while (1) {
            r18 = r22 + 8 | 0;
            r21 = HEAPU16[r18 >> 1] < (r13 & 65535);
            do {
              if (r11) {
                if (r21) {
                  r5 = 655;
                  break;
                } else {
                  r16 = r22;
                  r17 = 0;
                  break L842;
                }
              } else {
                if (r21) {
                  break;
                } else {
                  r5 = 655;
                  break;
                }
              }
            } while (0);
            if (r5 == 655) {
              r5 = 0;
              r24 = HEAPU16[r18 >> 1];
              if (r24 >>> 0 <= r10 >>> 0) {
                break;
              }
            }
            r21 = HEAP32[r22 + 4 >> 2];
            if ((r21 | 0) == (r14 | 0)) {
              r16 = r21;
              r17 = 0;
              break L842;
            } else {
              r22 = r21;
            }
          }
          if (r24 >>> 0 < r10 >>> 0) {
            r16 = r22;
            r17 = 0;
          } else {
            r5 = 685;
            break L836;
          }
        } else {
          r5 = 685;
          break L836;
        }
      } while (0);
      r12 = _enet_malloc(76);
      r14 = r12;
      if ((r12 | 0) == 0) {
        break;
      }
      r11 = r2 + 2 | 0;
      HEAP16[r12 + 8 >> 1] = (tempInt = HEAPU8[r11] | HEAPU8[r11 + 1 | 0] << 8, tempInt << 16 >> 16);
      HEAP16[r12 + 10 >> 1] = r17;
      _memcpy(r12 + 12 | 0, r9, 48);
      HEAP32[r12 + 60 >> 2] = r4;
      HEAP32[r12 + 64 >> 2] = r4;
      HEAP32[r12 + 72 >> 2] = r3;
      r11 = (r12 + 68 | 0) >> 2;
      HEAP32[r11] = 0;
      do {
        if ((r4 | 0) != 0) {
          if (r4 >>> 0 < 1048577) {
            r13 = _enet_malloc((r4 + 31 | 0) >>> 5 << 2);
            HEAP32[r11] = r13;
            r25 = r13;
          } else {
            r25 = HEAP32[r11];
          }
          if ((r25 | 0) == 0) {
            _enet_free(r12);
            break L836;
          } else {
            _memset(r25, 0, (r4 + 31 | 0) >>> 5 << 2);
            break;
          }
        }
      } while (0);
      if ((r3 | 0) != 0) {
        r11 = r3 | 0;
        HEAP32[r11 >> 2] = HEAP32[r11 >> 2] + 1 | 0;
      }
      _enet_list_insert(HEAP32[r16 >> 2], r12);
      r11 = HEAP8[r9] & 15;
      if ((r11 | 0) == 8 | (r11 | 0) == 6) {
        _enet_peer_dispatch_incoming_reliable_commands(r1, r8);
        r26 = r14;
        return r26;
      } else {
        _enet_peer_dispatch_incoming_unreliable_commands(r1, r8);
        r26 = r14;
        return r26;
      }
    }
  } while (0);
  do {
    if (r5 == 685) {
      if ((r4 | 0) != 0) {
        break;
      }
      if ((r3 | 0) == 0) {
        r26 = 409916;
        return r26;
      }
      if ((HEAP32[r3 >> 2] | 0) != 0) {
        r26 = 409916;
        return r26;
      }
      _enet_packet_destroy(r3);
      r26 = 409916;
      return r26;
    }
  } while (0);
  if ((r3 | 0) == 0) {
    r26 = 0;
    return r26;
  }
  if ((HEAP32[r3 >> 2] | 0) != 0) {
    r26 = 0;
    return r26;
  }
  _enet_packet_destroy(r3);
  r26 = 0;
  return r26;
}
function _enet_host_flush(r1) {
  var r2;
  r2 = _enet_time_get();
  HEAP32[r1 + 48 >> 2] = r2;
  _enet_protocol_send_outgoing_commands(r1, 0, 0);
  return;
}
function _enet_protocol_send_outgoing_commands(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54;
  r4 = 0;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r6 = r5;
  r7 = r6 | 0;
  r8 = r6;
  r9 = r6;
  r10 = (r1 + 60 | 0) >> 2;
  HEAP32[r10] = 1;
  r11 = r1 + 36 | 0;
  r12 = r1 + 40 | 0;
  r13 = (r1 + 68 | 0) >> 1;
  r14 = r1 + 1608 | 0;
  r15 = (r1 + 2132 | 0) >> 2;
  r16 = (r1 + 64 | 0) >> 2;
  r17 = (r3 | 0) == 0;
  r3 = r1 + 48 | 0;
  r18 = (r1 + 48 | 0) >> 2;
  r19 = r1 + 1612 | 0;
  r20 = r19 | 0;
  r21 = r19 | 0;
  r19 = r6 + 2 | 0;
  r6 = r1 + 1616 | 0;
  r22 = r1 + 2140 | 0;
  r23 = r1 + 2136 | 0;
  r24 = r1 | 0;
  r25 = r1 + 10364 | 0;
  r26 = r1 + 10368 | 0;
  r27 = r1 + 6252 | 0;
  r28 = r1 + 1620 | 0;
  r29 = r1 + 1624 | 0;
  r30 = (r1 + 1616 | 0) >> 2;
  r31 = r1 + 2144 | 0;
  r32 = r1 + 1620 | 0;
  r33 = r1 + 6252 | 0;
  r34 = r1 + 1616 | 0;
  r35 = r1 + 48 | 0;
  r36 = (r2 | 0) == 0;
  r37 = r2 | 0;
  L913 : while (1) {
    HEAP32[r10] = 0;
    if ((HEAP32[r12 >> 2] | 0) <= 0) {
      r38 = 0;
      r4 = 754;
      break;
    }
    r39 = HEAP32[r11 >> 2], r40 = r39 >> 2;
    while (1) {
      r41 = HEAP32[r40 + 9];
      L918 : do {
        if (!((r41 | 0) == 0 | (r41 | 0) == 9)) {
          HEAP16[r13] = 0;
          HEAP32[r14 >> 2] = 0;
          HEAP32[r15] = 1;
          HEAP32[r16] = 4;
          r42 = r39 + 192 | 0;
          if ((HEAP32[r42 >> 2] | 0) != (r42 | 0)) {
            _enet_protocol_send_acknowledgements(r1, r39);
          }
          do {
            if (!r17) {
              r42 = r39 + 200 | 0;
              if ((HEAP32[r42 >> 2] | 0) == (r42 | 0)) {
                break;
              }
              if ((HEAP32[r35 >> 2] - HEAP32[r40 + 20] | 0) >>> 0 > 86399999) {
                break;
              }
              if ((_enet_protocol_check_timeouts(r1, r39, r2) | 0) != 1) {
                break;
              }
              if (r36) {
                break L918;
              }
              if ((HEAP32[r37 >> 2] | 0) == 0) {
                break L918;
              } else {
                r38 = 1;
                r4 = 752;
                break L913;
              }
            }
          } while (0);
          r42 = r39 + 216 | 0;
          do {
            if ((HEAP32[r42 >> 2] | 0) == (r42 | 0)) {
              r4 = 717;
            } else {
              if ((_enet_protocol_send_reliable_outgoing_commands(r1, r39) | 0) == 0) {
                break;
              } else {
                r4 = 717;
                break;
              }
            }
          } while (0);
          do {
            if (r4 == 717) {
              r4 = 0;
              r42 = r39 + 200 | 0;
              if ((HEAP32[r42 >> 2] | 0) != (r42 | 0)) {
                break;
              }
              r42 = HEAP32[r3 >> 2];
              r43 = HEAP32[r40 + 19];
              r44 = r42 - r43 | 0;
              if ((r44 >>> 0 > 86399999 ? r43 - r42 | 0 : r44) >>> 0 < HEAP32[r40 + 34] >>> 0) {
                break;
              }
              if ((HEAP32[r40 + 44] - HEAP32[r16] | 0) >>> 0 <= 3) {
                break;
              }
              _enet_peer_ping(r39);
              _enet_protocol_send_reliable_outgoing_commands(r1, r39);
            }
          } while (0);
          r44 = r39 + 224 | 0;
          if ((HEAP32[r44 >> 2] | 0) != (r44 | 0)) {
            _enet_protocol_send_unreliable_outgoing_commands(r1, r39);
          }
          if ((HEAP32[r14 >> 2] | 0) == 0) {
            break;
          }
          r44 = (r39 + 88 | 0) >> 2;
          r42 = HEAP32[r44];
          r43 = HEAP32[r18];
          do {
            if ((r42 | 0) == 0) {
              HEAP32[r44] = r43;
            } else {
              r45 = r43 - r42 | 0;
              if ((r45 >>> 0 > 86399999 ? r42 - r43 | 0 : r45) >>> 0 <= 9999) {
                break;
              }
              r45 = r39 + 92 | 0;
              r46 = HEAP32[r45 >> 2];
              if ((r46 | 0) == 0) {
                break;
              }
              r47 = r39 + 96 | 0;
              r48 = Math.floor((HEAP32[r47 >> 2] << 16 >>> 0) / (r46 >>> 0));
              r46 = (r39 + 104 | 0) >> 2;
              r49 = HEAP32[r46];
              HEAP32[r46] = r49 - (r49 >>> 2) | 0;
              r49 = (r39 + 100 | 0) >> 2;
              r50 = HEAP32[r49];
              if (r48 >>> 0 < r50 >>> 0) {
                r51 = r50 - ((r50 - r48 | 0) >>> 3) | 0;
                HEAP32[r49] = r51;
                r52 = HEAP32[r46] + ((r51 - r48 | 0) >>> 2) | 0;
              } else {
                r51 = ((r48 - r50 | 0) >>> 3) + r50 | 0;
                HEAP32[r49] = r51;
                r52 = HEAP32[r46] + ((r48 - r51 | 0) >>> 2) | 0;
              }
              HEAP32[r46] = r52;
              HEAP32[r44] = HEAP32[r18];
              HEAP32[r45 >> 2] = 0;
              HEAP32[r47 >> 2] = 0;
            }
          } while (0);
          HEAP32[r21 >> 2] = r9;
          if ((HEAP16[r13] | 0) < 0) {
            r44 = _htons(HEAP32[r18] & 65535);
            HEAP16[r19 >> 1] = r44;
            HEAP32[r6 >> 2] = 4;
          } else {
            HEAP32[r34 >> 2] = 2;
          }
          r44 = HEAP32[r22 >> 2];
          do {
            if ((r44 | 0) == 0) {
              r53 = 0;
            } else {
              r43 = HEAP32[r31 >> 2];
              if ((r43 | 0) == 0) {
                r53 = 0;
                break;
              }
              r42 = HEAP32[r16] - 4 | 0;
              r47 = FUNCTION_TABLE[r43](r44, r32, HEAP32[r15] - 1 | 0, r42, r33, r42);
              if (!((r47 | 0) != 0 & r47 >>> 0 < r42 >>> 0)) {
                r53 = 0;
                break;
              }
              HEAP16[r13] = HEAP16[r13] | 16384;
              r53 = r47;
            }
          } while (0);
          r44 = (r39 + 12 | 0) >> 1;
          if (HEAPU16[r44] < 4095) {
            HEAP16[r13] = HEAPU8[r39 + 20 | 0] << 12 | HEAP16[r13];
          }
          r47 = _htons(HEAP16[r13] | HEAP16[r44]);
          HEAP16[r7 >> 1] = r47;
          if ((HEAP32[r23 >> 2] | 0) != 0) {
            r47 = r8 + HEAP32[r30] | 0;
            if (HEAPU16[r44] < 4095) {
              r54 = HEAP32[r40 + 4];
            } else {
              r54 = 0;
            }
            HEAP32[r47 >> 2] = r54;
            HEAP32[r30] = HEAP32[r30] + 4 | 0;
            r44 = FUNCTION_TABLE[HEAP32[r23 >> 2]](r20, HEAP32[r15]);
            HEAP32[r47 >> 2] = r44;
          }
          if ((r53 | 0) != 0) {
            HEAP32[r28 >> 2] = r27;
            HEAP32[r29 >> 2] = r53;
            HEAP32[r15] = 2;
          }
          HEAP32[r40 + 18] = HEAP32[r18];
          r44 = _enet_socket_send(HEAP32[r24 >> 2], r39 + 24 | 0, r20, HEAP32[r15]);
          _enet_protocol_remove_sent_unreliable_commands(r39);
          if ((r44 | 0) < 0) {
            r38 = -1;
            r4 = 751;
            break L913;
          }
          HEAP32[r25 >> 2] = HEAP32[r25 >> 2] + r44 | 0;
          HEAP32[r26 >> 2] = HEAP32[r26 >> 2] + 1 | 0;
        }
      } while (0);
      r41 = r39 + 380 | 0;
      if (r41 >>> 0 < (HEAP32[r11 >> 2] + (HEAP32[r12 >> 2] * 380 & -1) | 0) >>> 0) {
        r39 = r41, r40 = r39 >> 2;
      } else {
        break;
      }
    }
    if ((HEAP32[r10] | 0) == 0) {
      r38 = 0;
      r4 = 753;
      break;
    }
  }
  if (r4 == 751) {
    STACKTOP = r5;
    return r38;
  } else if (r4 == 752) {
    STACKTOP = r5;
    return r38;
  } else if (r4 == 753) {
    STACKTOP = r5;
    return r38;
  } else if (r4 == 754) {
    STACKTOP = r5;
    return r38;
  }
}
function _enet_host_check_events(r1, r2) {
  var r3;
  if ((r2 | 0) == 0) {
    r3 = -1;
    return r3;
  }
  HEAP32[r2 >> 2] = 0;
  HEAP32[r2 + 4 >> 2] = 0;
  HEAP32[r2 + 16 >> 2] = 0;
  r3 = _enet_protocol_dispatch_incoming_commands(r1, r2);
  return r3;
}
function _enet_protocol_dispatch_incoming_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17;
  r3 = r2 >> 2;
  r4 = 0;
  r5 = r1 + 52 | 0;
  r6 = r5 | 0;
  r7 = HEAP32[r6 >> 2];
  if ((r7 | 0) == (r5 | 0)) {
    r8 = 0;
    return r8;
  }
  r9 = r2 + 8 | 0;
  r10 = r2 + 16 | 0;
  r2 = r7;
  L990 : while (1) {
    r11 = _enet_list_remove(r2);
    r12 = r11;
    r13 = r11 + 240 | 0;
    HEAP32[r13 >> 2] = 0;
    r14 = r11 + 36 | 0;
    r7 = HEAP32[r14 >> 2];
    do {
      if ((r7 | 0) == 9) {
        r4 = 764;
        break L990;
      } else if ((r7 | 0) == 5) {
        r15 = r11 + 232 | 0;
        r16 = r15;
        r17 = r15;
        if ((HEAP32[r17 >> 2] | 0) == (r16 | 0)) {
          break;
        }
        r15 = _enet_peer_receive(r12, r9);
        HEAP32[r10 >> 2] = r15;
        if ((r15 | 0) != 0) {
          r4 = 768;
          break L990;
        }
      } else if ((r7 | 0) == 3 | (r7 | 0) == 4) {
        r4 = 763;
        break L990;
      }
    } while (0);
    r7 = HEAP32[r6 >> 2];
    if ((r7 | 0) == (r5 | 0)) {
      r8 = 0;
      r4 = 775;
      break;
    } else {
      r2 = r7;
    }
  }
  if (r4 == 764) {
    HEAP32[r1 + 32 >> 2] = 1;
    HEAP32[r3] = 2;
    HEAP32[r3 + 1] = r12;
    HEAP32[r3 + 3] = HEAP32[r11 + 376 >> 2];
    _enet_peer_reset(r12);
    r8 = 1;
    return r8;
  } else if (r4 == 768) {
    HEAP32[r3] = 3;
    HEAP32[r3 + 1] = r12;
    if ((HEAP32[r17 >> 2] | 0) == (r16 | 0)) {
      r8 = 1;
      return r8;
    }
    HEAP32[r13 >> 2] = 1;
    _enet_list_insert(r5, r11);
    r8 = 1;
    return r8;
  } else if (r4 == 763) {
    HEAP32[r14 >> 2] = 5;
    HEAP32[r3] = 1;
    HEAP32[r3 + 1] = r12;
    HEAP32[r3 + 3] = HEAP32[r11 + 376 >> 2];
    r8 = 1;
    return r8;
  } else if (r4 == 775) {
    return r8;
  }
}
function _enet_host_service(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r4 = 0;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r6 = r5;
  r7 = (r2 | 0) != 0;
  do {
    if (r7) {
      HEAP32[r2 >> 2] = 0;
      HEAP32[r2 + 4 >> 2] = 0;
      HEAP32[r2 + 16 >> 2] = 0;
      r8 = _enet_protocol_dispatch_incoming_commands(r1, r2);
      if ((r8 | 0) == 1) {
        r9 = 1;
        break;
      } else if ((r8 | 0) != -1) {
        r4 = 780;
        break;
      }
      _perror(411380);
      r9 = -1;
      break;
    } else {
      r4 = 780;
    }
  } while (0);
  L1011 : do {
    if (r4 == 780) {
      r8 = _enet_time_get();
      r10 = (r1 + 48 | 0) >> 2;
      HEAP32[r10] = r8;
      r11 = r8 + r3 | 0;
      r8 = r1 + 20 | 0;
      r12 = r1 | 0;
      while (1) {
        r13 = HEAP32[r10];
        r14 = HEAP32[r8 >> 2];
        r15 = r13 - r14 | 0;
        if ((r15 >>> 0 > 86399999 ? r14 - r13 | 0 : r15) >>> 0 > 999) {
          _enet_host_bandwidth_throttle(r1);
        }
        r15 = _enet_protocol_send_outgoing_commands(r1, r2, 1);
        if ((r15 | 0) == -1) {
          r4 = 784;
          break;
        } else if ((r15 | 0) == 1) {
          r9 = 1;
          break L1011;
        }
        r15 = _enet_protocol_receive_incoming_commands(r1, r2);
        if ((r15 | 0) == 1) {
          r9 = 1;
          break L1011;
        } else if ((r15 | 0) == -1) {
          r4 = 786;
          break;
        }
        r15 = _enet_protocol_send_outgoing_commands(r1, r2, 1);
        if ((r15 | 0) == 1) {
          r9 = 1;
          break L1011;
        } else if ((r15 | 0) == -1) {
          r4 = 788;
          break;
        }
        if (r7) {
          r15 = _enet_protocol_dispatch_incoming_commands(r1, r2);
          if ((r15 | 0) == 1) {
            r9 = 1;
            break L1011;
          } else if ((r15 | 0) == -1) {
            r4 = 791;
            break;
          }
        }
        r15 = _enet_time_get();
        HEAP32[r10] = r15;
        if ((r15 - r11 | 0) >>> 0 <= 86399999) {
          r9 = 0;
          break L1011;
        }
        HEAP32[r6 >> 2] = 2;
        r15 = HEAP32[r10];
        r13 = r11 - r15 | 0;
        if ((_enet_socket_wait(HEAP32[r12 >> 2], r6, r13 >>> 0 > 86399999 ? r15 - r11 | 0 : r13) | 0) != 0) {
          r9 = -1;
          break L1011;
        }
        r13 = _enet_time_get();
        HEAP32[r10] = r13;
        if ((HEAP32[r6 >> 2] | 0) != 2) {
          r9 = 0;
          break L1011;
        }
      }
      if (r4 == 784) {
        _perror(411348);
        r9 = -1;
        break;
      } else if (r4 == 786) {
        _perror(411224);
        r9 = -1;
        break;
      } else if (r4 == 791) {
        _perror(411380);
        r9 = -1;
        break;
      } else if (r4 == 788) {
        _perror(411348);
        r9 = -1;
        break;
      }
    }
  } while (0);
  STACKTOP = r5;
  return r9;
}
function _enet_protocol_receive_incoming_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17;
  r3 = 0;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r5 = r4;
  r6 = r1 + 2156 | 0;
  r7 = r5 | 0;
  r8 = r5 + 4 | 0;
  r9 = r1 | 0;
  r10 = r1 + 10348 | 0;
  r11 = r1 + 10356 | 0;
  r12 = r1 + 10360 | 0;
  r13 = r1 + 10372 | 0;
  r14 = r1 + 10376 | 0;
  r15 = (r2 | 0) == 0;
  while (1) {
    HEAP32[r7 >> 2] = r6;
    HEAP32[r8 >> 2] = 4096;
    r16 = _enet_socket_receive(HEAP32[r9 >> 2], r10, r5, 1);
    if ((r16 | 0) < 0) {
      r17 = -1;
      r3 = 804;
      break;
    }
    if ((r16 | 0) == 0) {
      r17 = 0;
      r3 = 806;
      break;
    }
    HEAP32[r11 >> 2] = r6;
    HEAP32[r12 >> 2] = r16;
    HEAP32[r13 >> 2] = HEAP32[r13 >> 2] + r16 | 0;
    HEAP32[r14 >> 2] = HEAP32[r14 >> 2] + 1 | 0;
    if ((_enet_packet_filter(r1) | 0) == 0) {
      r17 = 0;
      r3 = 807;
      break;
    }
    r16 = _enet_protocol_handle_incoming_commands(r1, r2);
    if ((r16 | 0) == 1 | (r16 | 0) == -1) {
      r17 = r16;
      r3 = 805;
      break;
    }
    if (!r15) {
      r3 = 802;
      break;
    }
  }
  if (r3 == 805) {
    STACKTOP = r4;
    return r17;
  } else if (r3 == 804) {
    STACKTOP = r4;
    return r17;
  } else if (r3 == 807) {
    STACKTOP = r4;
    return r17;
  } else if (r3 == 806) {
    STACKTOP = r4;
    return r17;
  } else if (r3 == 802) {
    HEAP32[r2 >> 2] = 100;
    HEAP32[r2 + 12 >> 2] = 0;
    r3 = _enet_packet_create(HEAP32[r11 >> 2], HEAP32[r12 >> 2], 4);
    HEAP32[r2 + 16 >> 2] = r3;
    r17 = 1;
    STACKTOP = r4;
    return r17;
  }
}
function _enet_protocol_handle_incoming_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27;
  r3 = 0;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 12 | 0;
  r5 = r4, r6 = r5 >> 2;
  r7 = r4 + 4;
  r8 = (r1 + 10360 | 0) >> 2;
  if (HEAP32[r8] >>> 0 < 2) {
    r9 = 0;
    STACKTOP = r4;
    return r9;
  }
  r10 = (r1 + 10356 | 0) >> 2;
  r11 = HEAP32[r10];
  r12 = r11;
  r13 = _htons((tempInt = HEAPU8[r12] | HEAPU8[r12 + 1 | 0] << 8, tempInt << 16 >> 16));
  r12 = (r13 & 65535) >>> 12 & 3;
  r14 = r13 & 4095;
  r15 = r13 & -16384 & 65535;
  r13 = r15 & 32768;
  r16 = (r13 | 0) == 0;
  r17 = (r1 + 2136 | 0) >> 2;
  r18 = (r13 >>> 14) + ((HEAP32[r17] | 0) == 0 ? 2 : 6) | 0;
  r13 = r14 & 65535;
  do {
    if (r14 << 16 >> 16 == 4095) {
      r19 = 0;
    } else {
      if (r13 >>> 0 >= HEAP32[r1 + 40 >> 2] >>> 0) {
        r9 = 0;
        STACKTOP = r4;
        return r9;
      }
      r20 = HEAP32[r1 + 36 >> 2];
      r21 = r20 + (r13 * 380 & -1) | 0;
      r22 = HEAP32[r20 + (r13 * 380 & -1) + 36 >> 2];
      if ((r22 | 0) == 0 | (r22 | 0) == 9) {
        r9 = 0;
        STACKTOP = r4;
        return r9;
      }
      r22 = r20 + (r13 * 380 & -1) + 24 | 0;
      r23 = HEAP32[r22 >> 2];
      do {
        if ((HEAP32[r1 + 10348 >> 2] | 0) == (r23 | 0)) {
          if ((HEAP16[r1 + 10352 >> 1] | 0) == (HEAP16[r20 + (r13 * 380 & -1) + 28 >> 1] | 0)) {
            break;
          }
          r24 = HEAP32[r22 >> 2];
          r3 = 816;
          break;
        } else {
          r24 = r23;
          r3 = 816;
        }
      } while (0);
      do {
        if (r3 == 816) {
          if ((r24 | 0) == -1) {
            break;
          } else {
            r9 = 0;
          }
          STACKTOP = r4;
          return r9;
        }
      } while (0);
      if (HEAPU16[r20 + (r13 * 380 & -1) + 12 >> 1] >= 4095) {
        r19 = r21;
        break;
      }
      if ((r12 | 0) == (HEAPU8[r20 + (r13 * 380 & -1) + 21 | 0] | 0)) {
        r19 = r21;
        break;
      } else {
        r9 = 0;
      }
      STACKTOP = r4;
      return r9;
    }
  } while (0);
  do {
    if ((r15 & 16384 | 0) != 0) {
      r13 = HEAP32[r1 + 2140 >> 2];
      if ((r13 | 0) == 0) {
        r9 = 0;
        STACKTOP = r4;
        return r9;
      }
      r12 = HEAP32[r1 + 2148 >> 2];
      if ((r12 | 0) == 0) {
        r9 = 0;
        STACKTOP = r4;
        return r9;
      }
      r24 = r1 + 6252 | 0;
      r14 = 4096 - r18 | 0;
      r23 = FUNCTION_TABLE[r12](r13, HEAP32[r10] + r18 | 0, HEAP32[r8] - r18 | 0, r1 + (r18 + 6252) | 0, r14);
      if ((r23 | 0) == 0 | r23 >>> 0 > r14 >>> 0) {
        r9 = 0;
        STACKTOP = r4;
        return r9;
      } else {
        _memcpy(r24, r11, r18);
        HEAP32[r10] = r24;
        HEAP32[r8] = r23 + r18 | 0;
        break;
      }
    }
  } while (0);
  do {
    if ((HEAP32[r17] | 0) != 0) {
      r15 = HEAP32[r10] + (r18 - 4) | 0;
      r23 = HEAP32[r15 >> 2];
      if ((r19 | 0) == 0) {
        r25 = 0;
      } else {
        r25 = HEAP32[r19 + 16 >> 2];
      }
      HEAP32[r15 >> 2] = r25;
      HEAP32[r7 >> 2] = HEAP32[r10];
      HEAP32[r7 + 4 >> 2] = HEAP32[r8];
      if ((FUNCTION_TABLE[HEAP32[r17]](r7, 1) | 0) == (r23 | 0)) {
        break;
      } else {
        r9 = 0;
      }
      STACKTOP = r4;
      return r9;
    }
  } while (0);
  if ((r19 | 0) != 0) {
    HEAP32[r19 + 24 >> 2] = HEAP32[r1 + 10348 >> 2];
    HEAP16[r19 + 28 >> 1] = HEAP16[r1 + 10352 >> 1];
    r7 = r19 + 64 | 0;
    HEAP32[r7 >> 2] = HEAP32[r7 >> 2] + HEAP32[r8] | 0;
  }
  r7 = HEAP32[r10] + r18 | 0;
  HEAP32[r6] = r7;
  r18 = r1 + 10380 | 0;
  r17 = HEAP32[r10] + HEAP32[r8] | 0;
  L1090 : do {
    if (r7 >>> 0 < r17 >>> 0) {
      r25 = r11 + 2 | 0;
      r23 = r19;
      r15 = r7;
      r24 = r17;
      while (1) {
        r14 = r15;
        if ((r15 + 4 | 0) >>> 0 > r24 >>> 0) {
          break L1090;
        }
        r13 = HEAP8[r15] & 15;
        r12 = r13 & 255;
        if ((r13 & 255) > 12 | r13 << 24 >> 24 == 0) {
          break L1090;
        }
        r22 = r15 + HEAP32[(r12 << 2) + 411016 >> 2] | 0;
        if (r22 >>> 0 > r24 >>> 0) {
          break L1090;
        }
        HEAP32[r6] = r22;
        if (!((r23 | 0) != 0 | r13 << 24 >> 24 == 2)) {
          break L1090;
        }
        r13 = r15 + 2 | 0;
        tempBigInt = _htons((tempInt = HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8, tempInt << 16 >> 16));
        HEAP8[r13] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r13 + 1 | 0] = tempBigInt & 255;
        do {
          if ((r12 | 0) == 9) {
            if ((_enet_protocol_handle_send_unsequenced(r1, r23, r14, r5) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 10) {
            if ((_enet_protocol_handle_bandwidth_limit(r1, r23, r14) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 11) {
            if ((_enet_protocol_handle_throttle_configure(r23, r14) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 12) {
            if ((_enet_protocol_handle_send_unreliable_fragment(r1, r23, r14, r5) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 2) {
            if ((r23 | 0) != 0) {
              break L1090;
            }
            if ((HEAP32[r18 >> 2] | 0) != 0) {
              break L1090;
            }
            r13 = _enet_protocol_handle_connect(r1, r14);
            if ((r13 | 0) == 0) {
              break L1090;
            } else {
              r26 = r13;
              r3 = 852;
              break;
            }
          } else if ((r12 | 0) == 1) {
            if ((_enet_protocol_handle_acknowledge(r1, r2, r23, r14) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 4) {
            _enet_protocol_handle_disconnect(r1, r23, r14);
            r3 = 851;
            break;
          } else if ((r12 | 0) == 5) {
            if ((_enet_protocol_handle_ping(r23) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 8) {
            if ((_enet_protocol_handle_send_fragment(r1, r23, r14, r5) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 6) {
            if ((_enet_protocol_handle_send_reliable(r1, r23, r14, r5) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 7) {
            if ((_enet_protocol_handle_send_unreliable(r1, r23, r14, r5) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else if ((r12 | 0) == 3) {
            if ((_enet_protocol_handle_verify_connect(r1, r2, r23, r14) | 0) == 0) {
              r3 = 851;
              break;
            } else {
              break L1090;
            }
          } else {
            break L1090;
          }
        } while (0);
        do {
          if (r3 == 851) {
            r3 = 0;
            if ((r23 | 0) == 0) {
              r27 = 0;
              break;
            } else {
              r26 = r23;
              r3 = 852;
              break;
            }
          }
        } while (0);
        do {
          if (r3 == 852) {
            r3 = 0;
            r12 = HEAP8[r15];
            if (r12 << 24 >> 24 >= 0) {
              r27 = r26;
              break;
            }
            if (r16) {
              break L1090;
            }
            r13 = _htons((tempInt = HEAPU8[r25] | HEAPU8[r25 + 1 | 0] << 8, tempInt << 16 >> 16));
            r22 = HEAP32[r26 + 36 >> 2];
            if ((r22 | 0) == 7 | (r22 | 0) == 2 | (r22 | 0) == 0 | (r22 | 0) == 9) {
              r27 = r26;
              break;
            } else if ((r22 | 0) != 8) {
              _enet_peer_queue_acknowledgement(r26, r14, r13);
              r27 = r26;
              break;
            }
            if ((r12 & 15) << 24 >> 24 != 4) {
              r27 = r26;
              break;
            }
            _enet_peer_queue_acknowledgement(r26, r14, r13);
            r27 = r26;
          }
        } while (0);
        r14 = HEAP32[r6];
        r13 = HEAP32[r10] + HEAP32[r8] | 0;
        if (r14 >>> 0 < r13 >>> 0) {
          r23 = r27;
          r15 = r14;
          r24 = r13;
        } else {
          break L1090;
        }
      }
    }
  } while (0);
  do {
    if ((r2 | 0) != 0) {
      if ((HEAP32[r2 >> 2] | 0) == 0) {
        break;
      } else {
        r9 = 1;
      }
      STACKTOP = r4;
      return r9;
    }
  } while (0);
  r9 = 0;
  STACKTOP = r4;
  return r9;
}
function _enet_protocol_handle_acknowledge(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17;
  r5 = r3 >> 2;
  r6 = 0;
  r7 = r3 + 36 | 0;
  r8 = HEAP32[r7 >> 2];
  if ((r8 | 0) == 0 | (r8 | 0) == 9) {
    r9 = 0;
    return r9;
  }
  r8 = r4 + 6 | 0;
  r10 = _htons((tempInt = HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r8 = (r1 + 48 | 0) >> 2;
  r11 = HEAP32[r8];
  r12 = r11 & -65536 | r10;
  r13 = (r10 & 32768) >>> 0 > (r11 & 32768) >>> 0 ? r12 - 65536 | 0 : r12;
  if ((r11 - r13 | 0) >>> 0 > 86399999) {
    r9 = 0;
    return r9;
  }
  HEAP32[r5 + 19] = r11;
  HEAP32[r5 + 21] = 0;
  r11 = HEAP32[r8];
  r12 = r11 - r13 | 0;
  r10 = r12 >>> 0 > 86399999 ? r13 - r11 | 0 : r12;
  _enet_peer_throttle(r3, r10);
  r12 = (r3 + 172 | 0) >> 2;
  r11 = HEAP32[r12];
  HEAP32[r12] = r11 - (r11 >>> 2) | 0;
  r11 = (r3 + 168 | 0) >> 2;
  r13 = HEAP32[r11];
  if (r10 >>> 0 < r13 >>> 0) {
    r14 = r13 - ((r13 - r10 | 0) >>> 3) | 0;
    HEAP32[r11] = r14;
    r15 = HEAP32[r12] + ((r14 - r10 | 0) >>> 2) | 0;
  } else {
    r14 = ((r10 - r13 | 0) >>> 3) + r13 | 0;
    HEAP32[r11] = r14;
    r15 = HEAP32[r12] + ((r10 - r14 | 0) >>> 2) | 0;
  }
  HEAP32[r12] = r15;
  r15 = HEAP32[r11];
  r14 = (r3 + 156 | 0) >> 2;
  if (r15 >>> 0 < HEAP32[r14] >>> 0) {
    HEAP32[r14] = r15;
  }
  r15 = HEAP32[r12];
  r10 = (r3 + 164 | 0) >> 2;
  if (r15 >>> 0 > HEAP32[r10] >>> 0) {
    HEAP32[r10] = r15;
  }
  r15 = r3 + 120 | 0;
  r13 = HEAP32[r15 >> 2];
  do {
    if ((r13 | 0) == 0) {
      r6 = 885;
    } else {
      r16 = HEAP32[r8];
      r17 = r16 - r13 | 0;
      if ((r17 >>> 0 > 86399999 ? r13 - r16 | 0 : r17) >>> 0 < HEAP32[r5 + 33] >>> 0) {
        break;
      } else {
        r6 = 885;
        break;
      }
    }
  } while (0);
  if (r6 == 885) {
    HEAP32[r5 + 38] = HEAP32[r14];
    HEAP32[r5 + 40] = HEAP32[r10];
    HEAP32[r14] = HEAP32[r11];
    HEAP32[r10] = HEAP32[r12];
    HEAP32[r15 >> 2] = HEAP32[r8];
  }
  r8 = r4 + 4 | 0;
  r15 = _enet_protocol_remove_sent_reliable_command(r3, _htons((tempInt = HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8, tempInt << 16 >> 16)), HEAP8[r4 + 1 | 0]);
  r4 = HEAP32[r7 >> 2];
  if ((r4 | 0) == 6) {
    r7 = r3 + 216 | 0;
    if ((HEAP32[r7 >> 2] | 0) != (r7 | 0)) {
      r9 = 0;
      return r9;
    }
    r7 = r3 + 224 | 0;
    if ((HEAP32[r7 >> 2] | 0) != (r7 | 0)) {
      r9 = 0;
      return r9;
    }
    r7 = r3 + 200 | 0;
    if ((HEAP32[r7 >> 2] | 0) != (r7 | 0)) {
      r9 = 0;
      return r9;
    }
    _enet_peer_disconnect(r3, HEAP32[r5 + 94]);
    r9 = 0;
    return r9;
  } else if ((r4 | 0) == 7) {
    if ((r15 | 0) != 4) {
      r9 = -1;
      return r9;
    }
    _enet_protocol_notify_disconnect(r1, r3, r2);
    r9 = 0;
    return r9;
  } else if ((r4 | 0) == 2) {
    if ((r15 | 0) != 3) {
      r9 = -1;
      return r9;
    }
    _enet_protocol_notify_connect(r1, r3, r2);
    r9 = 0;
    return r9;
  } else {
    r9 = 0;
    return r9;
  }
}
function _enet_protocol_handle_connect(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25;
  r3 = 0;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r5 = r4;
  r6 = r2 + 16 | 0;
  r7 = _htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0);
  if ((r7 | 0) == 0 | r7 >>> 0 > 255) {
    r8 = 0;
    STACKTOP = r4;
    return r8;
  }
  r6 = (r1 + 36 | 0) >> 2;
  r9 = HEAP32[r6];
  r10 = (r1 + 40 | 0) >> 2;
  L1179 : do {
    if ((HEAP32[r10] | 0) > 0) {
      r11 = r1 + 10348 | 0;
      r12 = r1 + 10352 | 0;
      r13 = r2 + 40 | 0;
      r14 = r9;
      L1181 : while (1) {
        do {
          if ((HEAP32[r14 + 36 >> 2] | 0) != 0) {
            if ((HEAP32[r14 + 24 >> 2] | 0) != (HEAP32[r11 >> 2] | 0)) {
              break;
            }
            if ((HEAP16[r14 + 28 >> 1] | 0) != (HEAP16[r12 >> 1] | 0)) {
              break;
            }
            if ((HEAP32[r14 + 16 >> 2] | 0) == (HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0)) {
              r8 = 0;
              break L1181;
            }
          }
        } while (0);
        r15 = r14 + 380 | 0;
        r16 = HEAP32[r6];
        if (r15 >>> 0 < (r16 + (HEAP32[r10] * 380 & -1) | 0) >>> 0) {
          r14 = r15;
        } else {
          r17 = r16;
          break L1179;
        }
      }
      STACKTOP = r4;
      return r8;
    } else {
      r17 = r9;
    }
  } while (0);
  r9 = HEAP32[r6] + (HEAP32[r10] * 380 & -1) | 0;
  r14 = r17;
  while (1) {
    if (r14 >>> 0 >= r9 >>> 0) {
      break;
    }
    if ((HEAP32[r14 + 36 >> 2] | 0) == 0) {
      break;
    } else {
      r14 = r14 + 380 | 0;
    }
  }
  if (r14 >>> 0 >= (HEAP32[r6] + (HEAP32[r10] * 380 & -1) | 0) >>> 0) {
    r8 = 0;
    STACKTOP = r4;
    return r8;
  }
  r10 = HEAP32[r1 + 44 >> 2];
  r6 = r7 >>> 0 > r10 >>> 0 ? r10 : r7;
  r7 = _enet_malloc(r6 * 60 & -1);
  r10 = (r14 + 40 | 0) >> 2;
  HEAP32[r10] = r7;
  if ((r7 | 0) == 0) {
    r8 = 0;
    STACKTOP = r4;
    return r8;
  }
  HEAP32[r14 + 44 >> 2] = r6;
  HEAP32[r14 + 36 >> 2] = 2;
  r7 = r2 + 40 | 0;
  r9 = r14 + 16 | 0;
  HEAP32[r9 >> 2] = HEAPU8[r7] | HEAPU8[r7 + 1 | 0] << 8 | HEAPU8[r7 + 2 | 0] << 16 | HEAPU8[r7 + 3 | 0] << 24 | 0;
  r7 = r1 + 10348 | 0;
  r17 = r14 + 24 | 0;
  r13 = HEAP32[r7 + 4 >> 2];
  HEAP32[r17 >> 2] = HEAP32[r7 >> 2];
  HEAP32[r17 + 4 >> 2] = r13;
  r13 = r2 + 4 | 0;
  r17 = _htons((tempInt = HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8, tempInt << 16 >> 16));
  HEAP16[r14 + 12 >> 1] = r17;
  r17 = r2 + 20 | 0;
  r13 = _htonl(HEAPU8[r17] | HEAPU8[r17 + 1 | 0] << 8 | HEAPU8[r17 + 2 | 0] << 16 | HEAPU8[r17 + 3 | 0] << 24 | 0);
  r17 = (r14 + 48 | 0) >> 2;
  HEAP32[r17] = r13;
  r13 = r2 + 24 | 0;
  r7 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  HEAP32[r14 + 52 >> 2] = r7;
  r7 = r2 + 28 | 0;
  r13 = _htonl(HEAPU8[r7] | HEAPU8[r7 + 1 | 0] << 8 | HEAPU8[r7 + 2 | 0] << 16 | HEAPU8[r7 + 3 | 0] << 24 | 0);
  r7 = r14 + 132 | 0;
  HEAP32[r7 >> 2] = r13;
  r13 = r2 + 32 | 0;
  r12 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  r13 = r14 + 124 | 0;
  HEAP32[r13 >> 2] = r12;
  r12 = r2 + 36 | 0;
  r11 = _htonl(HEAPU8[r12] | HEAPU8[r12 + 1 | 0] << 8 | HEAPU8[r12 + 2 | 0] << 16 | HEAPU8[r12 + 3 | 0] << 24 | 0);
  r12 = r14 + 128 | 0;
  HEAP32[r12 >> 2] = r11;
  r11 = r2 + 44 | 0;
  r16 = _htonl(HEAPU8[r11] | HEAPU8[r11 + 1 | 0] << 8 | HEAPU8[r11 + 2 | 0] << 16 | HEAPU8[r11 + 3 | 0] << 24 | 0);
  HEAP32[r14 + 376 >> 2] = r16;
  r16 = HEAP8[r2 + 6 | 0];
  if (r16 << 24 >> 24 == -1) {
    r18 = HEAP8[r14 + 20 | 0];
  } else {
    r18 = r16;
  }
  r16 = r18 + 1 & 3;
  r11 = r14 + 20 | 0;
  if (r16 << 24 >> 24 == (HEAP8[r11] | 0)) {
    r19 = r18 + 2 & 3;
  } else {
    r19 = r16;
  }
  HEAP8[r11] = r19;
  r11 = HEAP8[r2 + 7 | 0];
  if (r11 << 24 >> 24 == -1) {
    r20 = HEAP8[r14 + 21 | 0];
  } else {
    r20 = r11;
  }
  r11 = r20 + 1 & 3;
  r16 = r14 + 21 | 0;
  if (r11 << 24 >> 24 == (HEAP8[r16] | 0)) {
    r21 = r20 + 2 & 3;
  } else {
    r21 = r11;
  }
  HEAP8[r16] = r21;
  L1212 : do {
    if ((r6 | 0) > 0) {
      r16 = HEAP32[r10], r11 = r16 >> 1;
      while (1) {
        HEAP16[r11] = 0;
        HEAP16[r11 + 1] = 0;
        HEAP16[r11 + 19] = 0;
        HEAP16[r11 + 20] = 0;
        _enet_list_clear(r16 + 44 | 0);
        _enet_list_clear(r16 + 52 | 0);
        r20 = r16 + 60 | 0;
        _memset(r16 + 4 | 0, 0, 34);
        if (r20 >>> 0 < (HEAP32[r10] + (r6 * 60 & -1) | 0) >>> 0) {
          r16 = r20, r11 = r16 >> 1;
        } else {
          break L1212;
        }
      }
    }
  } while (0);
  r10 = r2 + 8 | 0;
  r16 = _htonl(HEAPU8[r10] | HEAPU8[r10 + 1 | 0] << 8 | HEAPU8[r10 + 2 | 0] << 16 | HEAPU8[r10 + 3 | 0] << 24 | 0);
  if (r16 >>> 0 < 576) {
    r22 = 576;
  } else {
    r22 = r16 >>> 0 > 4096 ? 4096 : r16;
  }
  r16 = r14 + 176 | 0;
  HEAP32[r16 >> 2] = r22;
  r22 = (r1 + 16 | 0) >> 2;
  r10 = HEAP32[r22];
  do {
    if ((r10 | 0) == 0) {
      if ((HEAP32[r17] | 0) == 0) {
        HEAP32[r14 + 180 >> 2] = 32768;
        break;
      } else {
        r11 = HEAP32[r22];
        if ((r11 | 0) == 0) {
          r3 = 938;
          break;
        } else {
          r23 = r11;
          r3 = 937;
          break;
        }
      }
    } else {
      r23 = r10;
      r3 = 937;
    }
  } while (0);
  do {
    if (r3 == 937) {
      r10 = HEAP32[r17];
      if ((r10 | 0) == 0) {
        r3 = 938;
        break;
      }
      HEAP32[r14 + 180 >> 2] = (r23 >>> 0 < r10 >>> 0 ? r23 : r10) >>> 16 << 12;
      break;
    }
  } while (0);
  if (r3 == 938) {
    r3 = HEAP32[r22];
    r23 = HEAP32[r17];
    HEAP32[r14 + 180 >> 2] = (r3 >>> 0 > r23 >>> 0 ? r3 : r23) >>> 16 << 12;
  }
  r23 = (r14 + 180 | 0) >> 2;
  r3 = HEAP32[r23];
  do {
    if (r3 >>> 0 < 4096) {
      HEAP32[r23] = 4096;
    } else {
      if (r3 >>> 0 <= 32768) {
        break;
      }
      HEAP32[r23] = 32768;
    }
  } while (0);
  r23 = r1 + 12 | 0;
  r1 = HEAP32[r23 >> 2];
  if ((r1 | 0) == 0) {
    r24 = 32768;
  } else {
    r24 = r1 >>> 16 << 12;
  }
  r1 = r2 + 12 | 0;
  r2 = _htonl(HEAPU8[r1] | HEAPU8[r1 + 1 | 0] << 8 | HEAPU8[r1 + 2 | 0] << 16 | HEAPU8[r1 + 3 | 0] << 24 | 0);
  r1 = r24 >>> 0 > r2 >>> 0 ? r2 : r24;
  if (r1 >>> 0 < 4096) {
    r25 = 4096;
  } else {
    r25 = r1 >>> 0 > 32768 ? 32768 : r1;
  }
  HEAP8[r5 | 0] = -125;
  HEAP8[r5 + 1 | 0] = -1;
  r1 = r5 + 4 | 0;
  tempBigInt = _htons(HEAP16[r14 + 14 >> 1]);
  HEAP8[r1] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r1 + 1 | 0] = tempBigInt & 255;
  HEAP8[r5 + 6 | 0] = r19;
  HEAP8[r5 + 7 | 0] = r21;
  r21 = r5 + 8 | 0;
  tempBigInt = _htonl(HEAP32[r16 >> 2]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 12 | 0;
  tempBigInt = _htonl(r25);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 16 | 0;
  tempBigInt = _htonl(r6);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 20 | 0;
  tempBigInt = _htonl(HEAP32[r23 >> 2]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 24 | 0;
  tempBigInt = _htonl(HEAP32[r22]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 28 | 0;
  tempBigInt = _htonl(HEAP32[r7 >> 2]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 32 | 0;
  tempBigInt = _htonl(HEAP32[r13 >> 2]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 36 | 0;
  tempBigInt = _htonl(HEAP32[r12 >> 2]);
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  r21 = r5 + 40 | 0;
  tempBigInt = HEAP32[r9 >> 2];
  HEAP8[r21] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 1 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 2 | 0] = tempBigInt & 255;
  tempBigInt = tempBigInt >> 8;
  HEAP8[r21 + 3 | 0] = tempBigInt & 255;
  _enet_peer_queue_outgoing_command(r14, r5, 0, 0, 0);
  r8 = r14;
  STACKTOP = r4;
  return r8;
}
function _enet_protocol_handle_ping(r1) {
  return ((HEAP32[r1 + 36 >> 2] - 5 | 0) >>> 0 > 1) << 31 >> 31;
}
function _enet_protocol_handle_verify_connect(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9;
  if ((HEAP32[r3 + 36 >> 2] | 0) != 1) {
    r5 = 0;
    return r5;
  }
  r6 = r4 + 16 | 0;
  r7 = _htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0);
  do {
    if (!((r7 | 0) == 0 | r7 >>> 0 > 255)) {
      r6 = r4 + 28 | 0;
      if ((_htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0) | 0) != (HEAP32[r3 + 132 >> 2] | 0)) {
        break;
      }
      r6 = r4 + 32 | 0;
      if ((_htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0) | 0) != (HEAP32[r3 + 124 >> 2] | 0)) {
        break;
      }
      r6 = r4 + 36 | 0;
      if ((_htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0) | 0) != (HEAP32[r3 + 128 >> 2] | 0)) {
        break;
      }
      r6 = r4 + 40 | 0;
      if ((HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0) != (HEAP32[r3 + 16 >> 2] | 0)) {
        break;
      }
      _enet_protocol_remove_sent_reliable_command(r3, 1, -1);
      r6 = r3 + 44 | 0;
      if (r7 >>> 0 < HEAP32[r6 >> 2] >>> 0) {
        HEAP32[r6 >> 2] = r7;
      }
      r6 = r4 + 4 | 0;
      r8 = _htons((tempInt = HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8, tempInt << 16 >> 16));
      HEAP16[r3 + 12 >> 1] = r8;
      HEAP8[r3 + 21 | 0] = HEAP8[r4 + 6 | 0];
      HEAP8[r3 + 20 | 0] = HEAP8[r4 + 7 | 0];
      r8 = r4 + 8 | 0;
      r6 = _htonl(HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8 | HEAPU8[r8 + 2 | 0] << 16 | HEAPU8[r8 + 3 | 0] << 24 | 0);
      if (r6 >>> 0 < 576) {
        r9 = 576;
      } else {
        r9 = r6 >>> 0 > 4096 ? 4096 : r6;
      }
      r6 = r3 + 176 | 0;
      if (r9 >>> 0 < HEAP32[r6 >> 2] >>> 0) {
        HEAP32[r6 >> 2] = r9;
      }
      r6 = r4 + 12 | 0;
      r8 = _htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0);
      r6 = r8 >>> 0 < 4096 ? 4096 : r8;
      r8 = r6 >>> 0 > 32768 ? 32768 : r6;
      r6 = r3 + 180 | 0;
      if (r8 >>> 0 < HEAP32[r6 >> 2] >>> 0) {
        HEAP32[r6 >> 2] = r8;
      }
      r8 = r4 + 20 | 0;
      r6 = _htonl(HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8 | HEAPU8[r8 + 2 | 0] << 16 | HEAPU8[r8 + 3 | 0] << 24 | 0);
      HEAP32[r3 + 48 >> 2] = r6;
      r6 = r4 + 24 | 0;
      r8 = _htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0);
      HEAP32[r3 + 52 >> 2] = r8;
      _enet_protocol_notify_connect(r1, r3, r2);
      r5 = 0;
      return r5;
    }
  } while (0);
  HEAP32[r3 + 376 >> 2] = 0;
  _enet_protocol_dispatch_state(r1, r3, 9);
  r5 = -1;
  return r5;
}
function _enet_protocol_handle_disconnect(r1, r2, r3) {
  var r4, r5, r6;
  r4 = 0;
  r5 = (r2 + 36 | 0) >> 2;
  r6 = HEAP32[r5];
  if ((r6 | 0) == 0 | (r6 | 0) == 9 | (r6 | 0) == 8) {
    return;
  }
  _enet_peer_reset_queues(r2);
  r6 = HEAP32[r5];
  do {
    if ((r6 | 0) == 3) {
      HEAP32[r1 + 32 >> 2] = 1;
      r4 = 980;
      break;
    } else if ((r6 | 0) == 5 | (r6 | 0) == 6) {
      if ((HEAP8[r3 | 0] | 0) < 0) {
        HEAP32[r5] = 8;
        break;
      } else {
        _enet_protocol_dispatch_state(r1, r2, 9);
        r4 = 984;
        break;
      }
    } else if ((r6 | 0) == 4 | (r6 | 0) == 7) {
      _enet_protocol_dispatch_state(r1, r2, 9);
      r4 = 984;
      break;
    } else {
      r4 = 980;
    }
  } while (0);
  do {
    if (r4 == 980) {
      _enet_peer_reset(r2);
      r4 = 984;
      break;
    }
  } while (0);
  do {
    if (r4 == 984) {
      if ((HEAP32[r5] | 0) != 0) {
        break;
      }
      return;
    }
  } while (0);
  r5 = r3 + 4 | 0;
  r3 = _htonl(HEAPU8[r5] | HEAPU8[r5 + 1 | 0] << 8 | HEAPU8[r5 + 2 | 0] << 16 | HEAPU8[r5 + 3 | 0] << 24 | 0);
  HEAP32[r2 + 376 >> 2] = r3;
  return;
}
function _enet_protocol_handle_send_reliable(r1, r2, r3, r4) {
  var r5, r6;
  if (HEAPU8[r3 + 1 | 0] >>> 0 >= HEAP32[r2 + 44 >> 2] >>> 0) {
    return -1;
  }
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    return -1;
  }
  r5 = r3 + 4 | 0;
  r6 = _htons((tempInt = HEAPU8[r5] | HEAPU8[r5 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r5 = HEAP32[r4 >> 2] + r6 | 0;
  HEAP32[r4 >> 2] = r5;
  r4 = HEAP32[r1 + 10356 >> 2];
  if (r5 >>> 0 < r4 >>> 0) {
    return -1;
  }
  if (r5 >>> 0 > (r4 + HEAP32[r1 + 10360 >> 2] | 0) >>> 0) {
    return -1;
  }
  r1 = _enet_packet_create(r3 + 6 | 0, r6, 1);
  if ((r1 | 0) == 0) {
    return -1;
  } else {
    return ((_enet_peer_queue_incoming_command(r2, r3, r1, 0) | 0) == 0) << 31 >> 31;
  }
}
function _enet_protocol_handle_send_unreliable(r1, r2, r3, r4) {
  var r5, r6;
  if (HEAPU8[r3 + 1 | 0] >>> 0 >= HEAP32[r2 + 44 >> 2] >>> 0) {
    return -1;
  }
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    return -1;
  }
  r5 = r3 + 6 | 0;
  r6 = _htons((tempInt = HEAPU8[r5] | HEAPU8[r5 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r5 = HEAP32[r4 >> 2] + r6 | 0;
  HEAP32[r4 >> 2] = r5;
  r4 = HEAP32[r1 + 10356 >> 2];
  if (r5 >>> 0 < r4 >>> 0) {
    return -1;
  }
  if (r5 >>> 0 > (r4 + HEAP32[r1 + 10360 >> 2] | 0) >>> 0) {
    return -1;
  }
  r1 = _enet_packet_create(r3 + 8 | 0, r6, 0);
  if ((r1 | 0) == 0) {
    return -1;
  } else {
    return ((_enet_peer_queue_incoming_command(r2, r3, r1, 0) | 0) == 0) << 31 >> 31;
  }
}
function _enet_protocol_handle_send_unsequenced(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10;
  if (HEAPU8[r3 + 1 | 0] >>> 0 >= HEAP32[r2 + 44 >> 2] >>> 0) {
    r5 = -1;
    return r5;
  }
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    r5 = -1;
    return r5;
  }
  r6 = r3 + 6 | 0;
  r7 = _htons((tempInt = HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r6 = HEAP32[r4 >> 2] + r7 | 0;
  HEAP32[r4 >> 2] = r6;
  r4 = HEAP32[r1 + 10356 >> 2];
  if (r6 >>> 0 < r4 >>> 0) {
    r5 = -1;
    return r5;
  }
  if (r6 >>> 0 > (r4 + HEAP32[r1 + 10360 >> 2] | 0) >>> 0) {
    r5 = -1;
    return r5;
  }
  r1 = r3 + 4 | 0;
  r4 = _htons((tempInt = HEAPU8[r1] | HEAPU8[r1 + 1 | 0] << 8, tempInt << 16 >> 16));
  r1 = r4 & 65535;
  r6 = r1 & 1023;
  r8 = r2 + 244 | 0;
  r9 = HEAP16[r8 >> 1];
  r10 = (r4 & 65535) < (r9 & 65535) ? r1 | 65536 : r1;
  r4 = r9 & 65535;
  if (r10 >>> 0 >= (r4 + 32768 | 0) >>> 0) {
    r5 = 0;
    return r5;
  }
  r9 = (r10 & 65535) - r6 | 0;
  do {
    if ((r9 | 0) == (r4 | 0)) {
      if ((HEAP32[r2 + (r6 >>> 5 << 2) + 248 >> 2] & 1 << (r1 & 31) | 0) == 0) {
        break;
      } else {
        r5 = 0;
      }
      return r5;
    } else {
      HEAP16[r8 >> 1] = r9 & 65535;
      _memset(r2 + 248 | 0, 0, 128);
    }
  } while (0);
  r9 = _enet_packet_create(r3 + 8 | 0, r7, 2);
  if ((r9 | 0) == 0) {
    r5 = -1;
    return r5;
  }
  if ((_enet_peer_queue_incoming_command(r2, r3, r9, 0) | 0) == 0) {
    r5 = -1;
    return r5;
  }
  r9 = (r6 >>> 5 << 2) + r2 + 248 | 0;
  HEAP32[r9 >> 2] = HEAP32[r9 >> 2] | 1 << (r1 & 31);
  r5 = 0;
  return r5;
}
function _enet_protocol_handle_send_fragment(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25;
  r5 = 0;
  r6 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r7 = r6;
  r8 = r3 + 1 | 0;
  if (HEAPU8[r8] >>> 0 >= HEAP32[r2 + 44 >> 2] >>> 0) {
    r9 = -1;
    STACKTOP = r6;
    return r9;
  }
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    r9 = -1;
    STACKTOP = r6;
    return r9;
  }
  r10 = r3 + 6 | 0;
  r11 = _htons((tempInt = HEAPU8[r10] | HEAPU8[r10 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r10 = HEAP32[r4 >> 2] + r11 | 0;
  HEAP32[r4 >> 2] = r10;
  r4 = HEAP32[r1 + 10356 >> 2];
  if (r10 >>> 0 < r4 >>> 0) {
    r9 = -1;
    STACKTOP = r6;
    return r9;
  }
  if (r10 >>> 0 > (r4 + HEAP32[r1 + 10360 >> 2] | 0) >>> 0) {
    r9 = -1;
    STACKTOP = r6;
    return r9;
  }
  r1 = HEAPU8[r8];
  r8 = HEAP32[r2 + 40 >> 2];
  r4 = r8 + (r1 * 60 & -1) | 0;
  r10 = r3 + 4 | 0;
  r12 = _htons((tempInt = HEAPU8[r10] | HEAPU8[r10 + 1 | 0] << 8, tempInt << 16 >> 16));
  r10 = (r12 & 65535) >>> 12;
  r13 = r8 + (r1 * 60 & -1) + 38 | 0;
  r14 = HEAP16[r13 >> 1];
  r15 = (r14 & 65535) >>> 12;
  r16 = (r12 & 65535) < (r14 & 65535) ? r10 | 16 : r10;
  if ((r16 & 65535) < (r15 & 65535)) {
    r9 = 0;
    STACKTOP = r6;
    return r9;
  }
  if ((r16 & 65535) >>> 0 >= ((r15 & 65535) + 7 | 0) >>> 0) {
    r9 = 0;
    STACKTOP = r6;
    return r9;
  }
  r15 = r3 + 12 | 0;
  r16 = _htonl(HEAPU8[r15] | HEAPU8[r15 + 1 | 0] << 8 | HEAPU8[r15 + 2 | 0] << 16 | HEAPU8[r15 + 3 | 0] << 24 | 0);
  r15 = r3 + 8 | 0;
  r10 = _htonl(HEAPU8[r15] | HEAPU8[r15 + 1 | 0] << 8 | HEAPU8[r15 + 2 | 0] << 16 | HEAPU8[r15 + 3 | 0] << 24 | 0);
  r15 = r3 + 20 | 0;
  r14 = _htonl(HEAPU8[r15] | HEAPU8[r15 + 1 | 0] << 8 | HEAPU8[r15 + 2 | 0] << 16 | HEAPU8[r15 + 3 | 0] << 24 | 0);
  r15 = r3 + 16 | 0;
  r17 = _htonl(HEAPU8[r15] | HEAPU8[r15 + 1 | 0] << 8 | HEAPU8[r15 + 2 | 0] << 16 | HEAPU8[r15 + 3 | 0] << 24 | 0);
  if (r16 >>> 0 >= r10 >>> 0 | r10 >>> 0 > 1048576 | r17 >>> 0 > 1073741824 | r14 >>> 0 >= r17 >>> 0 | r11 >>> 0 > (r17 - r14 | 0) >>> 0) {
    r9 = -1;
    STACKTOP = r6;
    return r9;
  }
  r15 = r8 + (r1 * 60 & -1) + 44 | 0;
  r18 = HEAP32[r8 + (r1 * 60 & -1) + 48 >> 2];
  L1369 : do {
    if ((r18 | 0) == (r15 | 0)) {
      r5 = 1054;
    } else {
      r1 = HEAP16[r13 >> 1];
      r8 = (r12 & 65535) < (r1 & 65535);
      r19 = r18, r20 = r19 >> 2;
      while (1) {
        r21 = r19;
        r22 = r19 + 8 | 0;
        r23 = HEAPU16[r22 >> 1] < (r1 & 65535);
        do {
          if (r8) {
            if (r23) {
              r5 = 1047;
              break;
            } else {
              r5 = 1054;
              break L1369;
            }
          } else {
            if (r23) {
              break;
            } else {
              r5 = 1047;
              break;
            }
          }
        } while (0);
        if (r5 == 1047) {
          r5 = 0;
          r24 = HEAP16[r22 >> 1];
          if ((r24 & 65535) <= (r12 & 65535)) {
            break;
          }
        }
        r23 = HEAP32[r20 + 1];
        if ((r23 | 0) == (r15 | 0)) {
          r5 = 1054;
          break L1369;
        } else {
          r19 = r23, r20 = r19 >> 2;
        }
      }
      if ((r24 & 65535) < (r12 & 65535)) {
        r5 = 1054;
        break;
      }
      if ((HEAP8[r19 + 12 | 0] & 15) << 24 >> 24 != 8) {
        r9 = -1;
        STACKTOP = r6;
        return r9;
      }
      if ((r17 | 0) != (HEAP32[HEAP32[r20 + 18] + 12 >> 2] | 0)) {
        r9 = -1;
        STACKTOP = r6;
        return r9;
      }
      if ((r10 | 0) == (HEAP32[r20 + 15] | 0)) {
        if ((r19 | 0) == 0) {
          r5 = 1054;
          break;
        } else {
          r25 = r21;
          break;
        }
      } else {
        r9 = -1;
        STACKTOP = r6;
        return r9;
      }
    }
  } while (0);
  do {
    if (r5 == 1054) {
      _memcpy(r7 | 0, r3 | 0, 48);
      r21 = _enet_packet_create(0, r17, 1);
      if ((r21 | 0) == 0) {
        r9 = -1;
        STACKTOP = r6;
        return r9;
      }
      r24 = r7 + 2 | 0;
      tempBigInt = r12;
      HEAP8[r24] = tempBigInt & 255;
      tempBigInt = tempBigInt >> 8;
      HEAP8[r24 + 1 | 0] = tempBigInt & 255;
      r24 = _enet_peer_queue_incoming_command(r2, r7, r21, r10);
      if ((r24 | 0) == 0) {
        r9 = -1;
      } else {
        r25 = r24;
        break;
      }
      STACKTOP = r6;
      return r9;
    }
  } while (0);
  r10 = r16 >>> 5;
  r7 = r25 + 68 | 0;
  r12 = 1 << (r16 & 31);
  if ((HEAP32[HEAP32[r7 >> 2] + (r10 << 2) >> 2] & r12 | 0) != 0) {
    r9 = 0;
    STACKTOP = r6;
    return r9;
  }
  r16 = (r25 + 64 | 0) >> 2;
  HEAP32[r16] = HEAP32[r16] - 1 | 0;
  r17 = (r10 << 2) + HEAP32[r7 >> 2] | 0;
  HEAP32[r17 >> 2] = HEAP32[r17 >> 2] | r12;
  r12 = HEAP32[r25 + 72 >> 2];
  r25 = HEAP32[r12 + 12 >> 2];
  _memcpy(HEAP32[r12 + 8 >> 2] + r14 | 0, r3 + 24 | 0, (r14 + r11 | 0) >>> 0 > r25 >>> 0 ? r25 - r14 | 0 : r11);
  if ((HEAP32[r16] | 0) != 0) {
    r9 = 0;
    STACKTOP = r6;
    return r9;
  }
  _enet_peer_dispatch_incoming_reliable_commands(r2, r4);
  r9 = 0;
  STACKTOP = r6;
  return r9;
}
function _enet_protocol_handle_bandwidth_limit(r1, r2, r3) {
  var r4, r5, r6, r7;
  r4 = 0;
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    r5 = -1;
    return r5;
  }
  r6 = r3 + 4 | 0;
  r7 = _htonl(HEAPU8[r6] | HEAPU8[r6 + 1 | 0] << 8 | HEAPU8[r6 + 2 | 0] << 16 | HEAPU8[r6 + 3 | 0] << 24 | 0);
  r6 = (r2 + 48 | 0) >> 2;
  HEAP32[r6] = r7;
  r7 = r3 + 8 | 0;
  r3 = _htonl(HEAPU8[r7] | HEAPU8[r7 + 1 | 0] << 8 | HEAPU8[r7 + 2 | 0] << 16 | HEAPU8[r7 + 3 | 0] << 24 | 0);
  HEAP32[r2 + 52 >> 2] = r3;
  do {
    if ((HEAP32[r6] | 0) == 0) {
      if ((HEAP32[r1 + 16 >> 2] | 0) != 0) {
        r4 = 1079;
        break;
      }
      HEAP32[r2 + 180 >> 2] = 32768;
      break;
    } else {
      r4 = 1079;
    }
  } while (0);
  if (r4 == 1079) {
    r4 = HEAP32[r6];
    r6 = HEAP32[r1 + 16 >> 2];
    HEAP32[r2 + 180 >> 2] = (r4 >>> 0 < r6 >>> 0 ? r4 : r6) >>> 16 << 12;
  }
  r6 = (r2 + 180 | 0) >> 2;
  r2 = HEAP32[r6];
  if (r2 >>> 0 < 4096) {
    HEAP32[r6] = 4096;
    r5 = 0;
    return r5;
  }
  if (r2 >>> 0 <= 32768) {
    r5 = 0;
    return r5;
  }
  HEAP32[r6] = 32768;
  r5 = 0;
  return r5;
}
function _enet_protocol_handle_throttle_configure(r1, r2) {
  var r3, r4, r5;
  if ((HEAP32[r1 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    r3 = -1;
    return r3;
  }
  r4 = r2 + 4 | 0;
  r5 = _htonl(HEAPU8[r4] | HEAPU8[r4 + 1 | 0] << 8 | HEAPU8[r4 + 2 | 0] << 16 | HEAPU8[r4 + 3 | 0] << 24 | 0);
  HEAP32[r1 + 132 >> 2] = r5;
  r5 = r2 + 8 | 0;
  r4 = _htonl(HEAPU8[r5] | HEAPU8[r5 + 1 | 0] << 8 | HEAPU8[r5 + 2 | 0] << 16 | HEAPU8[r5 + 3 | 0] << 24 | 0);
  HEAP32[r1 + 124 >> 2] = r4;
  r4 = r2 + 12 | 0;
  r2 = _htonl(HEAPU8[r4] | HEAPU8[r4 + 1 | 0] << 8 | HEAPU8[r4 + 2 | 0] << 16 | HEAPU8[r4 + 3 | 0] << 24 | 0);
  HEAP32[r1 + 128 >> 2] = r2;
  r3 = 0;
  return r3;
}
function _enet_protocol_handle_send_unreliable_fragment(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24;
  r5 = 0;
  r6 = r3 + 1 | 0;
  if (HEAPU8[r6] >>> 0 >= HEAP32[r2 + 44 >> 2] >>> 0) {
    r7 = -1;
    return r7;
  }
  if ((HEAP32[r2 + 36 >> 2] - 5 | 0) >>> 0 >= 2) {
    r7 = -1;
    return r7;
  }
  r8 = r3 + 6 | 0;
  r9 = _htons((tempInt = HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8, tempInt << 16 >> 16)) & 65535;
  r8 = HEAP32[r4 >> 2] + r9 | 0;
  HEAP32[r4 >> 2] = r8;
  r4 = HEAP32[r1 + 10356 >> 2];
  if (r8 >>> 0 < r4 >>> 0) {
    r7 = -1;
    return r7;
  }
  if (r8 >>> 0 > (r4 + HEAP32[r1 + 10360 >> 2] | 0) >>> 0) {
    r7 = -1;
    return r7;
  }
  r1 = HEAPU8[r6];
  r6 = HEAP32[r2 + 40 >> 2];
  r4 = r6 + (r1 * 60 & -1) | 0;
  r8 = r3 + 2 | 0;
  r10 = (tempInt = HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8, tempInt << 16 >> 16);
  r8 = r3 + 4 | 0;
  r11 = _htons((tempInt = HEAPU8[r8] | HEAPU8[r8 + 1 | 0] << 8, tempInt << 16 >> 16));
  r8 = (r10 & 65535) >>> 12;
  r12 = r6 + (r1 * 60 & -1) + 38 | 0;
  r13 = HEAP16[r12 >> 1];
  r14 = (r13 & 65535) >>> 12;
  r15 = (r10 & 65535) < (r13 & 65535) ? r8 | 16 : r8;
  if ((r15 & 65535) < (r14 & 65535)) {
    r7 = 0;
    return r7;
  }
  if ((r15 & 65535) >>> 0 >= ((r14 & 65535) + 7 | 0) >>> 0) {
    r7 = 0;
    return r7;
  }
  do {
    if (r10 << 16 >> 16 == r13 << 16 >> 16) {
      if ((r11 & 65535) > HEAPU16[r6 + (r1 * 60 & -1) + 40 >> 1]) {
        break;
      } else {
        r7 = 0;
      }
      return r7;
    }
  } while (0);
  r13 = r3 + 12 | 0;
  r14 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  r13 = r3 + 8 | 0;
  r15 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  r13 = r3 + 20 | 0;
  r8 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  r13 = r3 + 16 | 0;
  r16 = _htonl(HEAPU8[r13] | HEAPU8[r13 + 1 | 0] << 8 | HEAPU8[r13 + 2 | 0] << 16 | HEAPU8[r13 + 3 | 0] << 24 | 0);
  if (r14 >>> 0 >= r15 >>> 0 | r15 >>> 0 > 1048576 | r16 >>> 0 > 1073741824 | r8 >>> 0 >= r16 >>> 0 | r9 >>> 0 > (r16 - r8 | 0) >>> 0) {
    r7 = -1;
    return r7;
  }
  r13 = r6 + (r1 * 60 & -1) + 52 | 0;
  r17 = HEAP32[r6 + (r1 * 60 & -1) + 56 >> 2];
  L1453 : do {
    if ((r17 | 0) == (r13 | 0)) {
      r5 = 1117;
    } else {
      r1 = HEAP16[r12 >> 1];
      r6 = (r10 & 65535) < (r1 & 65535);
      r18 = r17, r19 = r18 >> 2;
      L1455 : while (1) {
        r20 = r18;
        r21 = r18 + 8 | 0;
        r22 = HEAPU16[r21 >> 1] < (r1 & 65535);
        do {
          if (r6) {
            if (r22) {
              r5 = 1108;
              break;
            } else {
              r5 = 1117;
              break L1453;
            }
          } else {
            if (r22) {
              break;
            } else {
              r5 = 1108;
              break;
            }
          }
        } while (0);
        do {
          if (r5 == 1108) {
            r5 = 0;
            r22 = HEAP16[r21 >> 1];
            if ((r22 & 65535) < (r10 & 65535)) {
              r5 = 1117;
              break L1453;
            }
            if ((r22 & 65535) > (r10 & 65535)) {
              break;
            }
            r23 = HEAP16[r20 + 10 >> 1];
            if ((r23 & 65535) <= (r11 & 65535)) {
              break L1455;
            }
          }
        } while (0);
        r21 = HEAP32[r19 + 1];
        if ((r21 | 0) == (r13 | 0)) {
          r5 = 1117;
          break L1453;
        } else {
          r18 = r21, r19 = r18 >> 2;
        }
      }
      if ((r23 & 65535) < (r11 & 65535)) {
        r5 = 1117;
        break;
      }
      if ((HEAP8[r18 + 12 | 0] & 15) << 24 >> 24 != 12) {
        r7 = -1;
        return r7;
      }
      if ((r16 | 0) != (HEAP32[HEAP32[r19 + 18] + 12 >> 2] | 0)) {
        r7 = -1;
        return r7;
      }
      if ((r15 | 0) == (HEAP32[r19 + 15] | 0)) {
        if ((r18 | 0) == 0) {
          r5 = 1117;
          break;
        } else {
          r24 = r20;
          break;
        }
      } else {
        r7 = -1;
        return r7;
      }
    }
  } while (0);
  do {
    if (r5 == 1117) {
      r20 = _enet_packet_create(0, r16, 8);
      if ((r20 | 0) == 0) {
        r7 = -1;
        return r7;
      }
      r11 = _enet_peer_queue_incoming_command(r2, r3, r20, r15);
      if ((r11 | 0) == 0) {
        r7 = -1;
      } else {
        r24 = r11;
        break;
      }
      return r7;
    }
  } while (0);
  r15 = r14 >>> 5;
  r16 = r24 + 68 | 0;
  r5 = 1 << (r14 & 31);
  if ((HEAP32[HEAP32[r16 >> 2] + (r15 << 2) >> 2] & r5 | 0) != 0) {
    r7 = 0;
    return r7;
  }
  r14 = (r24 + 64 | 0) >> 2;
  HEAP32[r14] = HEAP32[r14] - 1 | 0;
  r11 = (r15 << 2) + HEAP32[r16 >> 2] | 0;
  HEAP32[r11 >> 2] = HEAP32[r11 >> 2] | r5;
  r5 = HEAP32[r24 + 72 >> 2];
  r24 = HEAP32[r5 + 12 >> 2];
  _memcpy(HEAP32[r5 + 8 >> 2] + r8 | 0, r3 + 24 | 0, (r8 + r9 | 0) >>> 0 > r24 >>> 0 ? r24 - r8 | 0 : r9);
  if ((HEAP32[r14] | 0) != 0) {
    r7 = 0;
    return r7;
  }
  _enet_peer_dispatch_incoming_unreliable_commands(r2, r4);
  r7 = 0;
  return r7;
}
function _enet_protocol_dispatch_state(r1, r2, r3) {
  HEAP32[r2 + 36 >> 2] = r3;
  r3 = r2 + 240 | 0;
  if ((HEAP32[r3 >> 2] | 0) != 0) {
    return;
  }
  _enet_list_insert(r1 + 52 | 0, r2);
  HEAP32[r3 >> 2] = 1;
  return;
}
function _enet_protocol_remove_sent_reliable_command(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13;
  r4 = 0;
  r5 = r1 + 200 | 0;
  r6 = r5 | 0;
  r7 = HEAP32[r6 >> 2];
  L1496 : do {
    if ((r7 | 0) == (r5 | 0)) {
      r4 = 1149;
    } else {
      r8 = r7;
      while (1) {
        if ((HEAP16[r8 + 8 >> 1] | 0) == r2 << 16 >> 16) {
          if ((HEAP8[r8 + 33 | 0] | 0) == r3 << 24 >> 24) {
            break;
          }
        }
        r9 = HEAP32[r8 >> 2];
        if ((r9 | 0) == (r5 | 0)) {
          r4 = 1149;
          break L1496;
        } else {
          r8 = r9;
        }
      }
      r10 = r8;
      r11 = 1;
      break;
    }
  } while (0);
  L1503 : do {
    if (r4 == 1149) {
      r7 = r1 + 216 | 0;
      r9 = HEAP32[r7 >> 2];
      if ((r9 | 0) == (r7 | 0)) {
        r12 = 0;
        return r12;
      } else {
        r13 = r9;
      }
      while (1) {
        r9 = r13;
        if ((HEAP16[r9 + 30 >> 1] | 0) == 0) {
          r12 = 0;
          r4 = 1170;
          break;
        }
        if ((HEAP16[r13 + 8 >> 1] | 0) == r2 << 16 >> 16) {
          if ((HEAP8[r13 + 33 | 0] | 0) == r3 << 24 >> 24) {
            r10 = r9;
            r11 = 0;
            break L1503;
          }
        }
        r9 = HEAP32[r13 >> 2];
        if ((r9 | 0) == (r7 | 0)) {
          r12 = 0;
          r4 = 1168;
          break;
        } else {
          r13 = r9;
        }
      }
      if (r4 == 1168) {
        return r12;
      } else if (r4 == 1170) {
        return r12;
      }
    }
  } while (0);
  if ((r10 | 0) == 0) {
    r12 = 0;
    return r12;
  }
  r4 = r3 & 255;
  do {
    if (r4 >>> 0 < HEAP32[r1 + 44 >> 2] >>> 0) {
      r3 = HEAP32[r1 + 40 >> 2];
      r13 = (r2 & 65535) >>> 12 & 65535;
      r7 = (r13 << 1) + r3 + (r4 * 60 & -1) + 6 | 0;
      r8 = HEAP16[r7 >> 1];
      if (r8 << 16 >> 16 == 0) {
        break;
      }
      r9 = r8 - 1 & 65535;
      HEAP16[r7 >> 1] = r9;
      if (r9 << 16 >> 16 != 0) {
        break;
      }
      r9 = r3 + (r4 * 60 & -1) + 4 | 0;
      HEAP16[r9 >> 1] = HEAPU16[r9 >> 1] & (1 << r13 ^ 65535) & 65535;
    }
  } while (0);
  r4 = HEAP8[r10 + 32 | 0] & 15;
  _enet_list_remove(r10 | 0);
  r2 = (r10 + 80 | 0) >> 2;
  do {
    if ((HEAP32[r2] | 0) != 0) {
      if ((r11 | 0) != 0) {
        r13 = r1 + 184 | 0;
        HEAP32[r13 >> 2] = HEAP32[r13 >> 2] - HEAPU16[r10 + 28 >> 1] | 0;
      }
      r13 = HEAP32[r2] | 0;
      HEAP32[r13 >> 2] = HEAP32[r13 >> 2] - 1 | 0;
      r13 = HEAP32[r2];
      if ((HEAP32[r13 >> 2] | 0) != 0) {
        break;
      }
      r9 = r13 + 4 | 0;
      HEAP32[r9 >> 2] = HEAP32[r9 >> 2] | 256;
      _enet_packet_destroy(HEAP32[r2]);
    }
  } while (0);
  _enet_free(r10);
  r10 = HEAP32[r6 >> 2];
  if ((r10 | 0) == (r5 | 0)) {
    r12 = r4;
    return r12;
  }
  HEAP32[r1 + 80 >> 2] = HEAP32[r10 + 16 >> 2] + HEAP32[r10 + 12 >> 2] | 0;
  r12 = r4;
  return r12;
}
function _enet_protocol_notify_connect(r1, r2, r3) {
  var r4;
  HEAP32[r1 + 32 >> 2] = 1;
  r4 = r2 + 36 | 0;
  if ((r3 | 0) == 0) {
    _enet_protocol_dispatch_state(r1, r2, (HEAP32[r4 >> 2] | 0) == 1 ? 4 : 3);
    return;
  } else {
    HEAP32[r4 >> 2] = 5;
    HEAP32[r3 >> 2] = 1;
    HEAP32[r3 + 4 >> 2] = r2;
    HEAP32[r3 + 12 >> 2] = HEAP32[r2 + 376 >> 2];
    return;
  }
}
function _enet_protocol_notify_disconnect(r1, r2, r3) {
  var r4, r5;
  r4 = r2 + 36 | 0;
  if (HEAP32[r4 >> 2] >>> 0 > 2) {
    HEAP32[r1 + 32 >> 2] = 1;
  }
  r5 = HEAP32[r4 >> 2];
  if ((r5 | 0) != 1 & r5 >>> 0 < 4) {
    _enet_peer_reset(r2);
    return;
  }
  if ((r3 | 0) == 0) {
    HEAP32[r2 + 376 >> 2] = 0;
    _enet_protocol_dispatch_state(r1, r2, 9);
    return;
  } else {
    HEAP32[r3 >> 2] = 2;
    HEAP32[r3 + 4 >> 2] = r2;
    HEAP32[r3 + 12 >> 2] = 0;
    _enet_peer_reset(r2);
    return;
  }
}
function _enet_protocol_send_acknowledgements(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25;
  r3 = r1 + 1608 | 0;
  r4 = r1 + 70 | 0;
  r5 = r1 + (HEAP32[r3 >> 2] * 48 & -1) + 70 | 0;
  r6 = r1 + 2132 | 0;
  r7 = r1 + 1612 | 0;
  r8 = (HEAP32[r6 >> 2] << 3) + r1 + 1612 | 0;
  r9 = r2 + 192 | 0;
  r10 = HEAP32[r9 >> 2];
  L1556 : do {
    if ((r10 | 0) == (r9 | 0)) {
      r11 = r8;
      r12 = r5;
    } else {
      r13 = r1 + 1606 | 0;
      r14 = r1 + 2132 | 0;
      r15 = r2 + 176 | 0;
      r16 = (r1 + 64 | 0) >> 2;
      r17 = r8;
      r18 = r10;
      r19 = r5;
      while (1) {
        if (!(r19 >>> 0 < r13 >>> 0 & r17 >>> 0 < r14 >>> 0)) {
          break;
        }
        if ((HEAP32[r15 >> 2] - HEAP32[r16] | 0) >>> 0 < 8) {
          break;
        }
        r20 = HEAP32[r18 >> 2];
        r21 = r19 | 0;
        HEAP32[r17 >> 2] = r21;
        HEAP32[r17 + 4 >> 2] = 8;
        HEAP32[r16] = HEAP32[r16] + 8 | 0;
        r22 = r18 + 12 | 0;
        r23 = r22;
        r24 = r23 + 2 | 0;
        r25 = _htons((tempInt = HEAPU8[r24] | HEAPU8[r24 + 1 | 0] << 8, tempInt << 16 >> 16));
        HEAP8[r21] = 1;
        HEAP8[r19 + 1 | 0] = HEAP8[r23 + 1 | 0];
        r23 = r19 + 2 | 0;
        tempBigInt = r25;
        HEAP8[r23] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r23 + 1 | 0] = tempBigInt & 255;
        r23 = r19 + 4 | 0;
        tempBigInt = r25;
        HEAP8[r23] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r23 + 1 | 0] = tempBigInt & 255;
        r23 = r19 + 6 | 0;
        tempBigInt = _htons(HEAP32[r18 + 8 >> 2] & 65535);
        HEAP8[r23] = tempBigInt & 255;
        tempBigInt = tempBigInt >> 8;
        HEAP8[r23 + 1 | 0] = tempBigInt & 255;
        if ((HEAP8[r22] & 15) << 24 >> 24 == 4) {
          _enet_protocol_dispatch_state(r1, r2, 9);
        }
        _enet_list_remove(r18);
        _enet_free(r18);
        r22 = r19 + 48 | 0;
        r23 = r17 + 8 | 0;
        if ((r20 | 0) == (r9 | 0)) {
          r11 = r23;
          r12 = r22;
          break L1556;
        } else {
          r17 = r23;
          r18 = r20;
          r19 = r22;
        }
      }
      HEAP32[r1 + 60 >> 2] = 1;
      r11 = r17;
      r12 = r19;
    }
  } while (0);
  HEAP32[r3 >> 2] = (r12 - r4 | 0) / 48 & -1;
  HEAP32[r6 >> 2] = r11 - r7 >> 3;
  return;
}
function _enet_protocol_check_timeouts(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27;
  r4 = 0;
  r5 = r2 + 200 | 0;
  r6 = r5 | 0;
  r7 = HEAP32[r6 >> 2];
  r8 = HEAP32[r2 + 216 >> 2];
  if ((r7 | 0) == (r5 | 0)) {
    r9 = 0;
    return r9;
  }
  r10 = r1 + 48 | 0;
  r11 = (r2 + 84 | 0) >> 2;
  r12 = r2 + 96 | 0;
  r13 = r2 + 80 | 0;
  r14 = r2 + 184 | 0;
  r15 = r2 + 148 | 0;
  r16 = r2 + 144 | 0;
  r17 = r7;
  L1571 : while (1) {
    r7 = HEAP32[r17 >> 2];
    r18 = HEAP32[r10 >> 2];
    r19 = r17 + 12 | 0;
    r20 = HEAP32[r19 >> 2];
    r21 = r18 - r20 | 0;
    r22 = r17 + 16 | 0;
    r23 = r22 >> 2;
    do {
      if ((r21 >>> 0 > 86399999 ? r20 - r18 | 0 : r21) >>> 0 >= HEAP32[r23] >>> 0) {
        r24 = HEAP32[r11];
        do {
          if ((r24 | 0) == 0) {
            r4 = 1205;
          } else {
            if ((r20 - r24 | 0) >>> 0 > 86399999) {
              r4 = 1205;
              break;
            }
            r25 = HEAP32[r11];
            break;
          }
        } while (0);
        if (r4 == 1205) {
          r4 = 0;
          r24 = HEAP32[r19 >> 2];
          HEAP32[r11] = r24;
          r25 = r24;
        }
        do {
          if ((r25 | 0) != 0) {
            r24 = HEAP32[r10 >> 2];
            r26 = r24 - r25 | 0;
            r27 = r26 >>> 0 > 86399999 ? r25 - r24 | 0 : r26;
            if (r27 >>> 0 >= HEAP32[r15 >> 2] >>> 0) {
              break L1571;
            }
            if (HEAP32[r23] >>> 0 < HEAP32[r17 + 20 >> 2] >>> 0) {
              break;
            }
            if (r27 >>> 0 >= HEAP32[r16 >> 2] >>> 0) {
              break L1571;
            }
          }
        } while (0);
        if ((HEAP32[r17 + 80 >> 2] | 0) != 0) {
          HEAP32[r14 >> 2] = HEAP32[r14 >> 2] - HEAPU16[r17 + 28 >> 1] | 0;
        }
        HEAP32[r12 >> 2] = HEAP32[r12 >> 2] + 1 | 0;
        HEAP32[r22 >> 2] = HEAP32[r23] << 1;
        _enet_list_insert(r8, _enet_list_remove(r17));
        r27 = HEAP32[r6 >> 2];
        if ((r7 | 0) != (r27 | 0) | (r27 | 0) == (r5 | 0)) {
          break;
        }
        HEAP32[r13 >> 2] = HEAP32[r7 + 16 >> 2] + HEAP32[r7 + 12 >> 2] | 0;
      }
    } while (0);
    if ((r7 | 0) == (r5 | 0)) {
      r9 = 0;
      r4 = 1217;
      break;
    } else {
      r17 = r7;
    }
  }
  if (r4 == 1217) {
    return r9;
  }
  _enet_protocol_notify_disconnect(r1, r2, r3);
  r9 = 1;
  return r9;
}
function _enet_protocol_send_reliable_outgoing_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44, r45, r46, r47, r48, r49, r50, r51, r52, r53, r54, r55, r56, r57, r58, r59, r60, r61, r62, r63, r64, r65, r66, r67, r68, r69, r70, r71;
  r3 = 0;
  r4 = (r1 + 1608 | 0) >> 2;
  r5 = r1 + 70 | 0;
  r6 = r1 + (HEAP32[r4] * 48 & -1) + 70 | 0;
  r7 = (r1 + 2132 | 0) >> 2;
  r8 = r1 + 1612 | 0;
  r9 = (HEAP32[r7] << 3) + r1 + 1612 | 0;
  r10 = r2 + 216 | 0;
  r11 = HEAP32[r10 >> 2];
  if ((r11 | 0) == (r10 | 0)) {
    r12 = 1;
    r13 = r9;
    r14 = r6;
    r15 = r14;
    r16 = r5;
    r17 = r15 - r16 | 0;
    r18 = (r17 | 0) / 48 & -1;
    HEAP32[r4] = r18;
    r19 = r13;
    r20 = r8;
    r21 = r19 - r20 | 0, r22 = r21 >> 3;
    r23 = r22;
    HEAP32[r7] = r23;
    return r12;
  }
  r24 = r2 + 44 | 0;
  r25 = r2 + 40 | 0;
  r26 = r2 + 108 | 0;
  r27 = r2 + 180 | 0;
  r28 = r2 + 184 | 0;
  r29 = r2 + 176 | 0;
  r30 = r1 + 1606 | 0;
  r31 = r1 + 2132 | 0;
  r32 = r2 + 176 | 0;
  r33 = (r1 + 64 | 0) >> 2;
  r34 = r2 + 168 | 0;
  r35 = r2 + 172 | 0;
  r36 = r2 + 140 | 0;
  r37 = r2 + 200 | 0;
  r38 = r37 | 0;
  r39 = r1 + 48 | 0;
  r40 = r2 + 80 | 0;
  r41 = r1 + 48 | 0;
  r42 = r1 + 68 | 0;
  r43 = r2 + 92 | 0;
  r44 = r2 + 184 | 0;
  r2 = r11;
  r11 = r9, r9 = r11 >> 2;
  r45 = 0;
  r46 = 0;
  r47 = 1;
  r48 = r6;
  L1599 : while (1) {
    r6 = HEAP32[r24 >> 2];
    r49 = r2;
    r50 = r45;
    r51 = r46;
    while (1) {
      r52 = r49;
      r53 = r51;
      L1603 : while (1) {
        r54 = r52;
        r55 = r52 + 32 | 0;
        r56 = HEAPU8[r55 + 1 | 0];
        if (r56 >>> 0 >= r6 >>> 0) {
          r3 = 1225;
          break;
        }
        r57 = HEAP32[r25 >> 2];
        r58 = r57 + (r56 * 60 & -1) | 0;
        r59 = HEAP16[r52 + 8 >> 1];
        r60 = (r59 & 65535) >>> 12;
        r61 = (r58 | 0) != 0;
        if (!r61) {
          r62 = r53;
          r63 = 0;
          r64 = r60;
          r65 = 0;
          break;
        }
        do {
          if ((r53 | 0) == 0) {
            if ((HEAP16[r54 + 30 >> 1] | 0) != 0) {
              r62 = 0;
              r63 = r58;
              r64 = r60;
              r65 = r61;
              break L1603;
            }
            if ((r59 & 4095) << 16 >> 16 != 0) {
              r62 = 0;
              r63 = r58;
              r64 = r60;
              r65 = r61;
              break L1603;
            }
            r66 = r60 & 65535;
            if (HEAPU16[r57 + (r56 * 60 & -1) + (((r66 | 16) - 1 | 0) % 16 << 1) + 6 >> 1] > 4095) {
              r67 = 1;
              break;
            }
            if ((HEAPU16[r57 + (r56 * 60 & -1) + 4 >> 1] & (255 >>> ((4096 - r66 | 0) >>> 0) | 255 << r66) | 0) != 0) {
              r67 = 1;
              break;
            }
            if ((r53 | 0) == 0) {
              r62 = 0;
              r63 = r58;
              r64 = r60;
              r65 = r61;
              break L1603;
            } else {
              r67 = r53;
            }
          } else {
            r67 = r53;
          }
        } while (0);
        r61 = HEAP32[r52 >> 2];
        if ((r61 | 0) == (r10 | 0)) {
          r12 = r47;
          r13 = r11;
          r14 = r48;
          r3 = 1256;
          break L1599;
        } else {
          r52 = r61;
          r53 = r67;
        }
      }
      if (r3 == 1225) {
        r3 = 0;
        r62 = r53;
        r63 = 0;
        r64 = HEAPU16[r52 + 8 >> 1] >>> 12;
        r65 = 0;
      }
      r68 = (r52 + 80 | 0) >> 2;
      if ((HEAP32[r68] | 0) == 0) {
        r69 = r50;
        break;
      }
      if ((r50 | 0) == 0) {
        r61 = Math.imul(HEAP32[r27 >> 2], HEAP32[r26 >> 2]) >>> 5;
        r60 = HEAP32[r29 >> 2];
        r58 = (HEAPU16[r52 + 28 >> 1] + HEAP32[r28 >> 2] | 0) >>> 0 > (r61 >>> 0 > r60 >>> 0 ? r61 : r60) >>> 0 ? 1 : r50;
        if ((r58 | 0) == 0) {
          r69 = 0;
          break;
        } else {
          r70 = r58;
        }
      } else {
        r70 = r50;
      }
      r58 = HEAP32[r52 >> 2];
      if ((r58 | 0) == (r10 | 0)) {
        r12 = r47;
        r13 = r11;
        r14 = r48;
        r3 = 1258;
        break L1599;
      } else {
        r49 = r58;
        r50 = r70;
        r51 = r62;
      }
    }
    r51 = r55;
    r50 = HEAP32[((HEAP8[r51] & 15) << 2) + 411016 >> 2];
    if (r48 >>> 0 >= r30 >>> 0) {
      r3 = 1243;
      break;
    }
    r49 = r11 + 8 | 0;
    if (r49 >>> 0 >= r31 >>> 0) {
      r3 = 1243;
      break;
    }
    r6 = HEAP32[r32 >> 2] - HEAP32[r33] | 0;
    if (r6 >>> 0 < r50 >>> 0) {
      r3 = 1243;
      break;
    }
    if ((HEAP32[r68] | 0) != 0) {
      if ((r6 & 65535) >>> 0 < (HEAPU16[r52 + 28 >> 1] + r50 & 65535) >>> 0) {
        r3 = 1243;
        break;
      }
    }
    r6 = HEAP32[r52 >> 2];
    do {
      if (r65) {
        if ((HEAP16[r54 + 30 >> 1] | 0) != 0) {
          break;
        }
        r58 = r64 & 65535;
        r60 = r63 + 4 | 0;
        HEAP16[r60 >> 1] = (HEAPU16[r60 >> 1] | 1 << r58) & 65535;
        r60 = (r58 << 1) + r63 + 6 | 0;
        HEAP16[r60 >> 1] = HEAP16[r60 >> 1] + 1 & 65535;
      }
    } while (0);
    r60 = r54 + 30 | 0;
    HEAP16[r60 >> 1] = HEAP16[r60 >> 1] + 1 & 65535;
    r60 = r52 + 16 | 0;
    r58 = r60;
    if ((HEAP32[r58 >> 2] | 0) == 0) {
      r61 = (HEAP32[r35 >> 2] << 2) + HEAP32[r34 >> 2] | 0;
      HEAP32[r60 >> 2] = r61;
      r60 = Math.imul(r61, HEAP32[r36 >> 2]);
      HEAP32[r52 + 20 >> 2] = r60;
    }
    if ((HEAP32[r38 >> 2] | 0) == (r37 | 0)) {
      HEAP32[r40 >> 2] = HEAP32[r58 >> 2] + HEAP32[r39 >> 2] | 0;
    }
    _enet_list_insert(r37, _enet_list_remove(r52));
    HEAP32[r52 + 12 >> 2] = HEAP32[r41 >> 2];
    r58 = r48 | 0;
    HEAP32[r9] = r58;
    HEAP32[r9 + 1] = r50;
    HEAP32[r33] = HEAP32[r33] + r50 | 0;
    HEAP16[r42 >> 1] = HEAP16[r42 >> 1] | -32768;
    _memcpy(r58, r51, 48);
    r58 = HEAP32[r68];
    if ((r58 | 0) == 0) {
      r71 = r11;
    } else {
      HEAP32[r49 >> 2] = HEAP32[r58 + 8 >> 2] + HEAP32[r52 + 24 >> 2] | 0;
      r58 = (r52 + 28 | 0) >> 1;
      HEAP32[r9 + 3] = HEAPU16[r58];
      HEAP32[r33] = HEAP32[r33] + HEAPU16[r58] | 0;
      HEAP32[r44 >> 2] = HEAP32[r44 >> 2] + HEAPU16[r58] | 0;
      r71 = r49;
    }
    HEAP32[r43 >> 2] = HEAP32[r43 >> 2] + 1 | 0;
    r58 = r48 + 48 | 0;
    r60 = r71 + 8 | 0;
    if ((r6 | 0) == (r10 | 0)) {
      r12 = 0;
      r13 = r60;
      r14 = r58;
      r3 = 1257;
      break;
    } else {
      r2 = r6;
      r11 = r60, r9 = r11 >> 2;
      r45 = r69;
      r46 = r62;
      r47 = 0;
      r48 = r58;
    }
  }
  if (r3 == 1256) {
    r15 = r14;
    r16 = r5;
    r17 = r15 - r16 | 0;
    r18 = (r17 | 0) / 48 & -1;
    HEAP32[r4] = r18;
    r19 = r13;
    r20 = r8;
    r21 = r19 - r20 | 0, r22 = r21 >> 3;
    r23 = r22;
    HEAP32[r7] = r23;
    return r12;
  } else if (r3 == 1257) {
    r15 = r14;
    r16 = r5;
    r17 = r15 - r16 | 0;
    r18 = (r17 | 0) / 48 & -1;
    HEAP32[r4] = r18;
    r19 = r13;
    r20 = r8;
    r21 = r19 - r20 | 0, r22 = r21 >> 3;
    r23 = r22;
    HEAP32[r7] = r23;
    return r12;
  } else if (r3 == 1258) {
    r15 = r14;
    r16 = r5;
    r17 = r15 - r16 | 0;
    r18 = (r17 | 0) / 48 & -1;
    HEAP32[r4] = r18;
    r19 = r13;
    r20 = r8;
    r21 = r19 - r20 | 0, r22 = r21 >> 3;
    r23 = r22;
    HEAP32[r7] = r23;
    return r12;
  } else if (r3 == 1243) {
    HEAP32[r1 + 60 >> 2] = 1;
    r12 = 0;
    r13 = r11;
    r14 = r48;
    r15 = r14;
    r16 = r5;
    r17 = r15 - r16 | 0;
    r18 = (r17 | 0) / 48 & -1;
    HEAP32[r4] = r18;
    r19 = r13;
    r20 = r8;
    r21 = r19 - r20 | 0, r22 = r21 >> 3;
    r23 = r22;
    HEAP32[r7] = r23;
    return r12;
  }
}
function _enet_initialize() {
  return 0;
}
function _enet_deinitialize() {
  return;
}
function _enet_protocol_send_unreliable_outgoing_commands(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39;
  r3 = 0;
  r4 = r1 + 1608 | 0;
  r5 = r1 + 70 | 0;
  r6 = r1 + (HEAP32[r4 >> 2] * 48 & -1) + 70 | 0;
  r7 = r1 + 2132 | 0;
  r8 = r1 + 1612 | 0;
  r9 = (HEAP32[r7 >> 2] << 3) + r1 + 1612 | 0;
  r10 = r2 + 224 | 0;
  r11 = r10 | 0;
  r12 = HEAP32[r11 >> 2];
  L1650 : do {
    if ((r12 | 0) == (r10 | 0)) {
      r13 = r9;
      r14 = r6;
    } else {
      r15 = r1 + 1606 | 0;
      r16 = r1 + 2132 | 0;
      r17 = r2 + 176 | 0;
      r18 = (r1 + 64 | 0) >> 2;
      r19 = r2 + 116 | 0;
      r20 = r2 + 108 | 0;
      r21 = r2 + 208 | 0;
      r22 = r12;
      r23 = r9, r24 = r23 >> 2;
      r25 = r6;
      L1652 : while (1) {
        r26 = r23 + 8 | 0;
        r27 = r26 >>> 0 < r16 >>> 0;
        if (r25 >>> 0 < r15 >>> 0) {
          r28 = r22;
        } else {
          break;
        }
        while (1) {
          r29 = r28;
          r30 = r28 + 32 | 0;
          r31 = HEAP32[((HEAP8[r30] & 15) << 2) + 411016 >> 2];
          if (!r27) {
            break L1652;
          }
          r32 = HEAP32[r17 >> 2] - HEAP32[r18] | 0;
          if (r32 >>> 0 < r31 >>> 0) {
            break L1652;
          }
          r33 = (r28 + 80 | 0) >> 2;
          if ((HEAP32[r33] | 0) == 0) {
            r3 = 1269;
            break;
          }
          if (r32 >>> 0 < (HEAPU16[r28 + 28 >> 1] + r31 | 0) >>> 0) {
            break L1652;
          }
          r32 = HEAP32[r28 >> 2];
          if ((HEAP32[r33] | 0) == 0) {
            r34 = r32;
            break;
          }
          if ((HEAP32[r28 + 24 >> 2] | 0) != 0) {
            r34 = r32;
            break;
          }
          r35 = HEAP32[r19 >> 2] + 7 & 31;
          HEAP32[r19 >> 2] = r35;
          if (r35 >>> 0 <= HEAP32[r20 >> 2] >>> 0) {
            r34 = r32;
            break;
          }
          r35 = HEAP16[r28 + 8 >> 1];
          r36 = HEAP16[r29 + 10 >> 1];
          r37 = r29;
          r29 = r32;
          while (1) {
            r32 = r37 + 80 | 0;
            r38 = HEAP32[r32 >> 2] | 0;
            HEAP32[r38 >> 2] = HEAP32[r38 >> 2] - 1 | 0;
            r38 = HEAP32[r32 >> 2];
            if ((HEAP32[r38 >> 2] | 0) == 0) {
              _enet_packet_destroy(r38);
            }
            _enet_list_remove(r37 | 0);
            _enet_free(r37);
            if ((r29 | 0) == (r10 | 0)) {
              break;
            }
            r38 = r29;
            if ((HEAP16[r29 + 8 >> 1] | 0) != r35 << 16 >> 16) {
              break;
            }
            if ((HEAP16[r38 + 10 >> 1] | 0) != r36 << 16 >> 16) {
              break;
            }
            r37 = r38;
            r29 = HEAP32[r29 >> 2];
          }
          if ((r29 | 0) == (r10 | 0)) {
            r13 = r23;
            r14 = r25;
            break L1650;
          } else {
            r28 = r29;
          }
        }
        if (r3 == 1269) {
          r3 = 0;
          r34 = HEAP32[r28 >> 2];
        }
        r27 = r25 | 0;
        HEAP32[r24] = r27;
        HEAP32[r24 + 1] = r31;
        HEAP32[r18] = HEAP32[r18] + r31 | 0;
        _memcpy(r27, r30, 48);
        _enet_list_remove(r28);
        r27 = HEAP32[r33];
        if ((r27 | 0) == 0) {
          _enet_free(r28);
          r39 = r23;
        } else {
          HEAP32[r26 >> 2] = HEAP32[r27 + 8 >> 2] + HEAP32[r28 + 24 >> 2] | 0;
          r27 = HEAPU16[r28 + 28 >> 1];
          HEAP32[r24 + 3] = r27;
          HEAP32[r18] = HEAP32[r18] + r27 | 0;
          _enet_list_insert(r21, r28);
          r39 = r26;
        }
        r27 = r25 + 48 | 0;
        r37 = r39 + 8 | 0;
        if ((r34 | 0) == (r10 | 0)) {
          r13 = r37;
          r14 = r27;
          break L1650;
        } else {
          r22 = r34;
          r23 = r37, r24 = r23 >> 2;
          r25 = r27;
        }
      }
      HEAP32[r1 + 60 >> 2] = 1;
      r13 = r23;
      r14 = r25;
    }
  } while (0);
  HEAP32[r4 >> 2] = (r14 - r5 | 0) / 48 & -1;
  HEAP32[r7 >> 2] = r13 - r8 >> 3;
  if ((HEAP32[r2 + 36 >> 2] | 0) != 6) {
    return;
  }
  r8 = r2 + 216 | 0;
  if ((HEAP32[r8 >> 2] | 0) != (r8 | 0)) {
    return;
  }
  if ((HEAP32[r11 >> 2] | 0) != (r10 | 0)) {
    return;
  }
  r10 = r2 + 200 | 0;
  if ((HEAP32[r10 >> 2] | 0) != (r10 | 0)) {
    return;
  }
  _enet_peer_disconnect(r2, HEAP32[r2 + 376 >> 2]);
  return;
}
function _enet_protocol_remove_sent_unreliable_commands(r1) {
  var r2, r3, r4, r5, r6, r7;
  r2 = r1 + 208 | 0;
  r1 = r2 | 0;
  r3 = HEAP32[r1 >> 2];
  if ((r3 | 0) == (r2 | 0)) {
    return;
  } else {
    r4 = r3;
  }
  while (1) {
    _enet_list_remove(r4);
    r3 = (r4 + 80 | 0) >> 2;
    r5 = HEAP32[r3];
    do {
      if ((r5 | 0) != 0) {
        r6 = r5 | 0;
        HEAP32[r6 >> 2] = HEAP32[r6 >> 2] - 1 | 0;
        r6 = HEAP32[r3];
        if ((HEAP32[r6 >> 2] | 0) != 0) {
          break;
        }
        r7 = r6 + 4 | 0;
        HEAP32[r7 >> 2] = HEAP32[r7 >> 2] | 256;
        _enet_packet_destroy(HEAP32[r3]);
      }
    } while (0);
    _enet_free(r4);
    r3 = HEAP32[r1 >> 2];
    if ((r3 | 0) == (r2 | 0)) {
      break;
    } else {
      r4 = r3;
    }
  }
  return;
}
function _enet_time_get() {
  var r1, r2;
  r1 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r2 = r1;
  _gettimeofday(r2, 0);
  STACKTOP = r1;
  return ((HEAP32[r2 + 4 >> 2] | 0) / 1e3 & -1) + (HEAP32[r2 >> 2] * 1e3 & -1) - HEAP32[102400] | 0;
}
function _enet_time_set(r1) {
  var r2, r3;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r3 = r2;
  _gettimeofday(r3, 0);
  HEAP32[102400] = (HEAP32[r3 >> 2] * 1e3 & -1) - r1 + ((HEAP32[r3 + 4 >> 2] | 0) / 1e3 & -1) | 0;
  STACKTOP = r2;
  return;
}
function _enet_address_set_host(r1, r2) {
  var r3, r4;
  r3 = _gethostbyname(r2);
  do {
    if ((r3 | 0) != 0) {
      if ((HEAP32[r3 + 8 >> 2] | 0) != 1) {
        break;
      }
      HEAP32[r1 >> 2] = HEAP32[HEAP32[HEAP32[r3 + 16 >> 2] >> 2] >> 2];
      r4 = 0;
      return r4;
    }
  } while (0);
  r4 = ((_inet_aton(r2, r1) | 0) == 0) << 31 >> 31;
  return r4;
}
function _enet_address_get_host_ip(r1, r2, r3) {
  var r4, r5;
  r4 = _inet_ntoa(HEAP32[r1 >> 2]);
  if ((r4 | 0) == 0) {
    r5 = -1;
    return r5;
  }
  _strncpy(r2, r4, r3);
  r5 = 0;
  return r5;
}
function _enet_address_get_host(r1, r2, r3) {
  var r4, r5, r6;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r5 = r4;
  HEAP32[r5 >> 2] = HEAP32[r1 >> 2];
  r6 = _gethostbyaddr(r5, 4, 1);
  if ((r6 | 0) == 0) {
    r5 = _enet_address_get_host_ip(r1, r2, r3);
    STACKTOP = r4;
    return r5;
  } else {
    _strncpy(r2, HEAP32[r6 >> 2], r3);
    r5 = 0;
    STACKTOP = r4;
    return r5;
  }
}
function _enet_socket_bind(r1, r2) {
  var r3, r4, r5, r6, r7;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 20 | 0;
  r4 = r3;
  r5 = r4 >> 2;
  HEAP32[r5] = 0;
  HEAP32[r5 + 1] = 0;
  HEAP32[r5 + 2] = 0;
  HEAP32[r5 + 3] = 0;
  HEAP32[r5 + 4] = 0;
  HEAP32[r4 >> 2] = 1;
  if ((r2 | 0) == 0) {
    HEAP16[r4 + 4 >> 1] = 0;
    HEAP32[r4 + 8 >> 2] = 0;
    r5 = r4;
    r6 = _bind(r1, r5, 20);
    STACKTOP = r3;
    return r6;
  } else {
    r7 = _htons(HEAP16[r2 + 4 >> 1]);
    HEAP16[r4 + 4 >> 1] = r7;
    HEAP32[r4 + 8 >> 2] = HEAP32[r2 >> 2];
    r5 = r4;
    r6 = _bind(r1, r5, 20);
    STACKTOP = r3;
    return r6;
  }
}
function _enet_socket_listen(r1, r2) {
  return _listen(r1, (r2 | 0) < 0 ? 128 : r2);
}
function _enet_socket_create(r1) {
  return _socket(2, (r1 | 0) == 2 ? 20 : 200, 0);
}
function _enet_socket_set_option(r1, r2, r3) {
  var r4, r5, r6;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r5 = r4;
  HEAP32[r5 >> 2] = r3;
  if ((r2 | 0) == 4) {
    r6 = _setsockopt(r1, 50, 40, r5, 4);
  } else if ((r2 | 0) == 3) {
    r6 = _setsockopt(r1, 50, 60, r5, 4);
  } else if ((r2 | 0) == 5) {
    r6 = _setsockopt(r1, 50, 30, r5, 4);
  } else if ((r2 | 0) == 6) {
    r6 = _setsockopt(r1, 50, 1e3, r5, 4);
  } else if ((r2 | 0) == 2) {
    r6 = _setsockopt(r1, 50, 6, r5, 4);
  } else if ((r2 | 0) == 7) {
    r6 = _setsockopt(r1, 50, 2e3, r5, 4);
  } else {
    r6 = -1;
  }
  STACKTOP = r4;
  return ((r6 | 0) == -1) << 31 >> 31;
}
function _enet_socket_connect(r1, r2) {
  var r3, r4, r5, r6;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 20 | 0;
  r4 = r3;
  r5 = r4 >> 2;
  HEAP32[r5] = 0;
  HEAP32[r5 + 1] = 0;
  HEAP32[r5 + 2] = 0;
  HEAP32[r5 + 3] = 0;
  HEAP32[r5 + 4] = 0;
  HEAP32[r4 >> 2] = 1;
  r5 = _htons(HEAP16[r2 + 4 >> 1]);
  HEAP16[r4 + 4 >> 1] = r5;
  HEAP32[r4 + 8 >> 2] = HEAP32[r2 >> 2];
  r2 = _connect(r1, r4, 20);
  do {
    if ((r2 | 0) == -1) {
      r4 = ___errno_location();
      if ((HEAP32[r4 >> 2] | 0) == 119) {
        r6 = 0;
      } else {
        break;
      }
      STACKTOP = r3;
      return r6;
    }
  } while (0);
  r6 = r2;
  STACKTOP = r3;
  return r6;
}
function _enet_socket_accept(r1, r2) {
  var r3, r4, r5, r6, r7, r8;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r4 = r3;
  r5 = r3 + 20;
  HEAP32[r5 >> 2] = 20;
  r6 = (r2 | 0) != 0;
  if (r6) {
    r7 = r4;
  } else {
    r7 = 0;
  }
  r8 = _accept(r1, r7, r6 ? r5 : 0);
  if ((r8 | 0) == -1 | r6 ^ 1) {
    STACKTOP = r3;
    return r8;
  }
  HEAP32[r2 >> 2] = HEAP32[r4 + 8 >> 2];
  r6 = _htons(HEAP16[r4 + 4 >> 1]);
  HEAP16[r2 + 4 >> 1] = r6;
  STACKTOP = r3;
  return r8;
}
function _enet_socket_shutdown(r1, r2) {
  return _shutdown(r1, r2);
}
function _enet_socket_destroy(r1) {
  if ((r1 | 0) == -1) {
    return;
  }
  _close(r1);
  return;
}
function _enet_socket_send(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r6 = r5, r7 = r6 >> 2;
  r8 = r5 + 28;
  r9 = r6 >> 2;
  HEAP32[r9] = 0;
  HEAP32[r9 + 1] = 0;
  HEAP32[r9 + 2] = 0;
  HEAP32[r9 + 3] = 0;
  HEAP32[r9 + 4] = 0;
  HEAP32[r9 + 5] = 0;
  HEAP32[r9 + 6] = 0;
  if ((r2 | 0) != 0) {
    r9 = r8, r10 = r9 >> 2;
    HEAP32[r10] = 0;
    HEAP32[r10 + 1] = 0;
    HEAP32[r10 + 2] = 0;
    HEAP32[r10 + 3] = 0;
    HEAP32[r10 + 4] = 0;
    HEAP32[r8 >> 2] = 1;
    r10 = _htons(HEAP16[r2 + 4 >> 1]);
    HEAP16[r8 + 4 >> 1] = r10;
    HEAP32[r8 + 8 >> 2] = HEAP32[r2 >> 2];
    HEAP32[r7] = r9;
    HEAP32[r7 + 1] = 20;
  }
  HEAP32[r7 + 2] = r3;
  HEAP32[r7 + 3] = r4;
  r4 = _sendmsg(r1, r6, 0);
  if ((r4 | 0) != -1) {
    r11 = r4;
    STACKTOP = r5;
    return r11;
  }
  r4 = ___errno_location();
  r11 = ((HEAP32[r4 >> 2] | 0) != 11) << 31 >> 31;
  STACKTOP = r5;
  return r11;
}
function _enet_socket_receive(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 48 | 0;
  r6 = r5, r7 = r6 >> 2;
  r8 = r5 + 28;
  r9 = r6 >> 2;
  HEAP32[r9] = 0;
  HEAP32[r9 + 1] = 0;
  HEAP32[r9 + 2] = 0;
  HEAP32[r9 + 3] = 0;
  HEAP32[r9 + 4] = 0;
  HEAP32[r9 + 5] = 0;
  HEAP32[r9 + 6] = 0;
  r9 = (r2 | 0) != 0;
  if (r9) {
    HEAP32[r7] = r8;
    HEAP32[r7 + 1] = 20;
  }
  HEAP32[r7 + 2] = r3;
  HEAP32[r7 + 3] = r4;
  r4 = _recvmsg(r1, r6, 0);
  if ((r4 | 0) == -1) {
    r6 = ___errno_location();
    r10 = ((HEAP32[r6 >> 2] | 0) != 11) << 31 >> 31;
    STACKTOP = r5;
    return r10;
  }
  if (!r9) {
    r10 = r4;
    STACKTOP = r5;
    return r10;
  }
  HEAP32[r2 >> 2] = HEAP32[r8 + 8 >> 2];
  r9 = _htons(HEAP16[r8 + 4 >> 1]);
  HEAP16[r2 + 4 >> 1] = r9;
  r10 = r4;
  STACKTOP = r5;
  return r10;
}
function _enet_socketset_select(r1, r2, r3, r4) {
  var r5, r6, r7;
  r5 = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  r6 = r5;
  r7 = Math.floor((r4 >>> 0) / 1e3);
  HEAP32[r6 >> 2] = r7;
  HEAP32[r6 + 4 >> 2] = (r4 >>> 0) % 1e3 * 1e3 & -1;
  r4 = _select(r1 + 1 | 0, r2, r3, 0, r6);
  STACKTOP = r5;
  return r4;
}
function _enet_socket_wait(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9;
  r4 = r2 >> 2;
  r2 = STACKTOP;
  STACKTOP = STACKTOP + 24 | 0;
  r5 = r2;
  r6 = r2 + 8;
  r7 = r2 + 16;
  r8 = Math.floor((r3 >>> 0) / 1e3);
  HEAP32[r7 >> 2] = r8;
  HEAP32[r7 + 4 >> 2] = (r3 >>> 0) % 1e3 * 1e3 & -1;
  r3 = r5;
  HEAP32[r3 >> 2] = 0;
  HEAP32[r3 + 4 >> 2] = 0;
  r3 = r6;
  HEAP32[r3 >> 2] = 0;
  HEAP32[r3 + 4 >> 2] = 0;
  if ((HEAP32[r4] & 1 | 0) != 0) {
    r3 = (r1 >>> 5 << 2) + r6 | 0;
    HEAP32[r3 >> 2] = HEAP32[r3 >> 2] | 1 << (r1 & 31);
  }
  if ((HEAP32[r4] & 2 | 0) != 0) {
    r3 = (r1 >>> 5 << 2) + r5 | 0;
    HEAP32[r3 >> 2] = HEAP32[r3 >> 2] | 1 << (r1 & 31);
  }
  r3 = _select(r1 + 1 | 0, r5, r6, 0, r7);
  if ((r3 | 0) < 0) {
    r9 = -1;
    STACKTOP = r2;
    return r9;
  }
  HEAP32[r4] = 0;
  if ((r3 | 0) == 0) {
    r9 = 0;
    STACKTOP = r2;
    return r9;
  }
  r3 = r1 >>> 5;
  r7 = 1 << (r1 & 31);
  if ((HEAP32[r6 + (r3 << 2) >> 2] & r7 | 0) != 0) {
    HEAP32[r4] = 1;
  }
  if ((HEAP32[r5 + (r3 << 2) >> 2] & r7 | 0) == 0) {
    r9 = 0;
    STACKTOP = r2;
    return r9;
  }
  HEAP32[r4] = HEAP32[r4] | 2;
  r9 = 0;
  STACKTOP = r2;
  return r9;
}
function _malloc(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18;
  do {
    if (r1 >>> 0 < 245) {
      if (r1 >>> 0 < 11) {
        r2 = 16;
      } else {
        r2 = r1 + 11 & -8;
      }
      r3 = r2 >>> 3;
      r4 = HEAP32[102854];
      r5 = r4 >>> (r3 >>> 0);
      if ((r5 & 3 | 0) != 0) {
        r6 = (r5 & 1 ^ 1) + r3 | 0;
        r7 = r6 << 1;
        r8 = (r7 << 2) + 411456 | 0;
        r9 = (r7 + 2 << 2) + 411456 | 0;
        r7 = HEAP32[r9 >> 2];
        r10 = r7 + 8 | 0;
        r11 = HEAP32[r10 >> 2];
        do {
          if ((r8 | 0) == (r11 | 0)) {
            HEAP32[102854] = r4 & (1 << r6 ^ -1);
          } else {
            if (r11 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            r12 = r11 + 12 | 0;
            if ((HEAP32[r12 >> 2] | 0) == (r7 | 0)) {
              HEAP32[r12 >> 2] = r8;
              HEAP32[r9 >> 2] = r11;
              break;
            } else {
              _abort();
            }
          }
        } while (0);
        r11 = r6 << 3;
        HEAP32[r7 + 4 >> 2] = r11 | 3;
        r9 = r7 + (r11 | 4) | 0;
        HEAP32[r9 >> 2] = HEAP32[r9 >> 2] | 1;
        r13 = r10;
        return r13;
      }
      if (r2 >>> 0 <= HEAP32[102856] >>> 0) {
        r14 = r2;
        break;
      }
      if ((r5 | 0) == 0) {
        if ((HEAP32[102855] | 0) == 0) {
          r14 = r2;
          break;
        }
        r9 = _tmalloc_small(r2);
        if ((r9 | 0) == 0) {
          r14 = r2;
          break;
        } else {
          r13 = r9;
        }
        return r13;
      }
      r9 = 2 << r3;
      r11 = r5 << r3 & (r9 | -r9);
      r9 = (r11 & -r11) - 1 | 0;
      r11 = r9 >>> 12 & 16;
      r8 = r9 >>> (r11 >>> 0);
      r9 = r8 >>> 5 & 8;
      r12 = r8 >>> (r9 >>> 0);
      r8 = r12 >>> 2 & 4;
      r15 = r12 >>> (r8 >>> 0);
      r12 = r15 >>> 1 & 2;
      r16 = r15 >>> (r12 >>> 0);
      r15 = r16 >>> 1 & 1;
      r17 = (r9 | r11 | r8 | r12 | r15) + (r16 >>> (r15 >>> 0)) | 0;
      r15 = r17 << 1;
      r16 = (r15 << 2) + 411456 | 0;
      r12 = (r15 + 2 << 2) + 411456 | 0;
      r15 = HEAP32[r12 >> 2];
      r8 = r15 + 8 | 0;
      r11 = HEAP32[r8 >> 2];
      do {
        if ((r16 | 0) == (r11 | 0)) {
          HEAP32[102854] = r4 & (1 << r17 ^ -1);
        } else {
          if (r11 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r9 = r11 + 12 | 0;
          if ((HEAP32[r9 >> 2] | 0) == (r15 | 0)) {
            HEAP32[r9 >> 2] = r16;
            HEAP32[r12 >> 2] = r11;
            break;
          } else {
            _abort();
          }
        }
      } while (0);
      r11 = r17 << 3;
      r12 = r11 - r2 | 0;
      HEAP32[r15 + 4 >> 2] = r2 | 3;
      r16 = r15;
      r4 = r16 + r2 | 0;
      HEAP32[r16 + (r2 | 4) >> 2] = r12 | 1;
      HEAP32[r16 + r11 >> 2] = r12;
      r11 = HEAP32[102856];
      if ((r11 | 0) != 0) {
        r16 = HEAP32[102859];
        r3 = r11 >>> 3;
        r11 = r3 << 1;
        r5 = (r11 << 2) + 411456 | 0;
        r10 = HEAP32[102854];
        r7 = 1 << r3;
        do {
          if ((r10 & r7 | 0) == 0) {
            HEAP32[102854] = r10 | r7;
            r18 = r5;
          } else {
            r3 = HEAP32[(r11 + 2 << 2) + 411456 >> 2];
            if (r3 >>> 0 >= HEAP32[102858] >>> 0) {
              r18 = r3;
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[(r11 + 2 << 2) + 411456 >> 2] = r16;
        HEAP32[r18 + 12 >> 2] = r16;
        HEAP32[r16 + 8 >> 2] = r18;
        HEAP32[r16 + 12 >> 2] = r5;
      }
      HEAP32[102856] = r12;
      HEAP32[102859] = r4;
      r13 = r8;
      return r13;
    } else {
      if (r1 >>> 0 > 4294967231) {
        r14 = -1;
        break;
      }
      r7 = r1 + 11 & -8;
      if ((HEAP32[102855] | 0) == 0) {
        r14 = r7;
        break;
      }
      r10 = _tmalloc_large(r7);
      if ((r10 | 0) == 0) {
        r14 = r7;
        break;
      } else {
        r13 = r10;
      }
      return r13;
    }
  } while (0);
  r1 = HEAP32[102856];
  if (r14 >>> 0 > r1 >>> 0) {
    r18 = HEAP32[102857];
    if (r14 >>> 0 < r18 >>> 0) {
      r2 = r18 - r14 | 0;
      HEAP32[102857] = r2;
      r18 = HEAP32[102860];
      r10 = r18;
      HEAP32[102860] = r10 + r14 | 0;
      HEAP32[r14 + (r10 + 4) >> 2] = r2 | 1;
      HEAP32[r18 + 4 >> 2] = r14 | 3;
      r13 = r18 + 8 | 0;
      return r13;
    } else {
      r13 = _sys_alloc(r14);
      return r13;
    }
  } else {
    r18 = r1 - r14 | 0;
    r2 = HEAP32[102859];
    if (r18 >>> 0 > 15) {
      r10 = r2;
      HEAP32[102859] = r10 + r14 | 0;
      HEAP32[102856] = r18;
      HEAP32[r14 + (r10 + 4) >> 2] = r18 | 1;
      HEAP32[r10 + r1 >> 2] = r18;
      HEAP32[r2 + 4 >> 2] = r14 | 3;
    } else {
      HEAP32[102856] = 0;
      HEAP32[102859] = 0;
      HEAP32[r2 + 4 >> 2] = r1 | 3;
      r14 = r1 + (r2 + 4) | 0;
      HEAP32[r14 >> 2] = HEAP32[r14 >> 2] | 1;
    }
    r13 = r2 + 8 | 0;
    return r13;
  }
}
function _tmalloc_small(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21;
  r2 = HEAP32[102855];
  r3 = (r2 & -r2) - 1 | 0;
  r2 = r3 >>> 12 & 16;
  r4 = r3 >>> (r2 >>> 0);
  r3 = r4 >>> 5 & 8;
  r5 = r4 >>> (r3 >>> 0);
  r4 = r5 >>> 2 & 4;
  r6 = r5 >>> (r4 >>> 0);
  r5 = r6 >>> 1 & 2;
  r7 = r6 >>> (r5 >>> 0);
  r6 = r7 >>> 1 & 1;
  r8 = HEAP32[((r3 | r2 | r4 | r5 | r6) + (r7 >>> (r6 >>> 0)) << 2) + 411720 >> 2];
  r6 = r8;
  r7 = r8, r5 = r7 >> 2;
  r4 = (HEAP32[r8 + 4 >> 2] & -8) - r1 | 0;
  while (1) {
    r8 = HEAP32[r6 + 16 >> 2];
    if ((r8 | 0) == 0) {
      r2 = HEAP32[r6 + 20 >> 2];
      if ((r2 | 0) == 0) {
        break;
      } else {
        r9 = r2;
      }
    } else {
      r9 = r8;
    }
    r8 = (HEAP32[r9 + 4 >> 2] & -8) - r1 | 0;
    r2 = r8 >>> 0 < r4 >>> 0;
    r6 = r9;
    r7 = r2 ? r9 : r7, r5 = r7 >> 2;
    r4 = r2 ? r8 : r4;
  }
  r9 = r7;
  r6 = HEAP32[102858];
  if (r9 >>> 0 < r6 >>> 0) {
    _abort();
  }
  r8 = r9 + r1 | 0;
  r2 = r8;
  if (r9 >>> 0 >= r8 >>> 0) {
    _abort();
  }
  r8 = HEAP32[r5 + 6];
  r3 = HEAP32[r5 + 3];
  L1878 : do {
    if ((r3 | 0) == (r7 | 0)) {
      r10 = r7 + 20 | 0;
      r11 = HEAP32[r10 >> 2];
      do {
        if ((r11 | 0) == 0) {
          r12 = r7 + 16 | 0;
          r13 = HEAP32[r12 >> 2];
          if ((r13 | 0) == 0) {
            r14 = 0, r15 = r14 >> 2;
            break L1878;
          } else {
            r16 = r13;
            r17 = r12;
            break;
          }
        } else {
          r16 = r11;
          r17 = r10;
        }
      } while (0);
      while (1) {
        r10 = r16 + 20 | 0;
        if ((HEAP32[r10 >> 2] | 0) == 0) {
          r11 = r16 + 16 | 0;
          if ((HEAP32[r11 >> 2] | 0) == 0) {
            break;
          } else {
            r18 = r11;
          }
        } else {
          r18 = r10;
        }
        r16 = HEAP32[r18 >> 2];
        r17 = r18;
      }
      if (r17 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r17 >> 2] = 0;
        r14 = r16, r15 = r14 >> 2;
        break;
      }
    } else {
      r10 = HEAP32[r5 + 2];
      if (r10 >>> 0 < r6 >>> 0) {
        _abort();
      }
      r11 = r10 + 12 | 0;
      if ((HEAP32[r11 >> 2] | 0) != (r7 | 0)) {
        _abort();
      }
      r12 = r3 + 8 | 0;
      if ((HEAP32[r12 >> 2] | 0) == (r7 | 0)) {
        HEAP32[r11 >> 2] = r3;
        HEAP32[r12 >> 2] = r10;
        r14 = r3, r15 = r14 >> 2;
        break;
      } else {
        _abort();
      }
    }
  } while (0);
  L1902 : do {
    if ((r8 | 0) != 0) {
      r3 = r7 + 28 | 0;
      r6 = (HEAP32[r3 >> 2] << 2) + 411720 | 0;
      do {
        if ((r7 | 0) == (HEAP32[r6 >> 2] | 0)) {
          HEAP32[r6 >> 2] = r14;
          if ((r14 | 0) != 0) {
            break;
          }
          HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r3 >> 2] ^ -1);
          break L1902;
        } else {
          if (r8 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r16 = r8 + 16 | 0;
          if ((HEAP32[r16 >> 2] | 0) == (r7 | 0)) {
            HEAP32[r16 >> 2] = r14;
          } else {
            HEAP32[r8 + 20 >> 2] = r14;
          }
          if ((r14 | 0) == 0) {
            break L1902;
          }
        }
      } while (0);
      if (r14 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      }
      HEAP32[r15 + 6] = r8;
      r3 = HEAP32[r5 + 4];
      do {
        if ((r3 | 0) != 0) {
          if (r3 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r15 + 4] = r3;
            HEAP32[r3 + 24 >> 2] = r14;
            break;
          }
        }
      } while (0);
      r3 = HEAP32[r5 + 5];
      if ((r3 | 0) == 0) {
        break;
      }
      if (r3 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r15 + 5] = r3;
        HEAP32[r3 + 24 >> 2] = r14;
        break;
      }
    }
  } while (0);
  if (r4 >>> 0 < 16) {
    r14 = r4 + r1 | 0;
    HEAP32[r5 + 1] = r14 | 3;
    r15 = r14 + (r9 + 4) | 0;
    HEAP32[r15 >> 2] = HEAP32[r15 >> 2] | 1;
    r19 = r7 + 8 | 0;
    r20 = r19;
    return r20;
  }
  HEAP32[r5 + 1] = r1 | 3;
  HEAP32[r1 + (r9 + 4) >> 2] = r4 | 1;
  HEAP32[r9 + r4 + r1 >> 2] = r4;
  r1 = HEAP32[102856];
  if ((r1 | 0) != 0) {
    r9 = HEAP32[102859];
    r5 = r1 >>> 3;
    r1 = r5 << 1;
    r15 = (r1 << 2) + 411456 | 0;
    r14 = HEAP32[102854];
    r8 = 1 << r5;
    do {
      if ((r14 & r8 | 0) == 0) {
        HEAP32[102854] = r14 | r8;
        r21 = r15;
      } else {
        r5 = HEAP32[(r1 + 2 << 2) + 411456 >> 2];
        if (r5 >>> 0 >= HEAP32[102858] >>> 0) {
          r21 = r5;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[(r1 + 2 << 2) + 411456 >> 2] = r9;
    HEAP32[r21 + 12 >> 2] = r9;
    HEAP32[r9 + 8 >> 2] = r21;
    HEAP32[r9 + 12 >> 2] = r15;
  }
  HEAP32[102856] = r4;
  HEAP32[102859] = r2;
  r19 = r7 + 8 | 0;
  r20 = r19;
  return r20;
}
function _tmalloc_large(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35;
  r2 = r1 >> 2;
  r3 = 0;
  r4 = -r1 | 0;
  r5 = r1 >>> 8;
  do {
    if ((r5 | 0) == 0) {
      r6 = 0;
    } else {
      if (r1 >>> 0 > 16777215) {
        r6 = 31;
        break;
      }
      r7 = (r5 + 1048320 | 0) >>> 16 & 8;
      r8 = r5 << r7;
      r9 = (r8 + 520192 | 0) >>> 16 & 4;
      r10 = r8 << r9;
      r8 = (r10 + 245760 | 0) >>> 16 & 2;
      r11 = 14 - (r9 | r7 | r8) + (r10 << r8 >>> 15) | 0;
      r6 = r1 >>> ((r11 + 7 | 0) >>> 0) & 1 | r11 << 1;
    }
  } while (0);
  r5 = HEAP32[(r6 << 2) + 411720 >> 2];
  L1948 : do {
    if ((r5 | 0) == 0) {
      r12 = 0;
      r13 = r4;
      r14 = 0;
    } else {
      if ((r6 | 0) == 31) {
        r15 = 0;
      } else {
        r15 = 25 - (r6 >>> 1) | 0;
      }
      r11 = 0;
      r8 = r4;
      r10 = r5, r7 = r10 >> 2;
      r9 = r1 << r15;
      r16 = 0;
      while (1) {
        r17 = HEAP32[r7 + 1] & -8;
        r18 = r17 - r1 | 0;
        if (r18 >>> 0 < r8 >>> 0) {
          if ((r17 | 0) == (r1 | 0)) {
            r12 = r10;
            r13 = r18;
            r14 = r10;
            break L1948;
          } else {
            r19 = r10;
            r20 = r18;
          }
        } else {
          r19 = r11;
          r20 = r8;
        }
        r18 = HEAP32[r7 + 5];
        r17 = HEAP32[((r9 >>> 31 << 2) + 16 >> 2) + r7];
        r21 = (r18 | 0) == 0 | (r18 | 0) == (r17 | 0) ? r16 : r18;
        if ((r17 | 0) == 0) {
          r12 = r19;
          r13 = r20;
          r14 = r21;
          break L1948;
        } else {
          r11 = r19;
          r8 = r20;
          r10 = r17, r7 = r10 >> 2;
          r9 = r9 << 1;
          r16 = r21;
        }
      }
    }
  } while (0);
  do {
    if ((r14 | 0) == 0 & (r12 | 0) == 0) {
      r20 = 2 << r6;
      r19 = HEAP32[102855] & (r20 | -r20);
      if ((r19 | 0) == 0) {
        r22 = r14;
        break;
      }
      r20 = (r19 & -r19) - 1 | 0;
      r19 = r20 >>> 12 & 16;
      r15 = r20 >>> (r19 >>> 0);
      r20 = r15 >>> 5 & 8;
      r5 = r15 >>> (r20 >>> 0);
      r15 = r5 >>> 2 & 4;
      r4 = r5 >>> (r15 >>> 0);
      r5 = r4 >>> 1 & 2;
      r16 = r4 >>> (r5 >>> 0);
      r4 = r16 >>> 1 & 1;
      r22 = HEAP32[((r20 | r19 | r15 | r5 | r4) + (r16 >>> (r4 >>> 0)) << 2) + 411720 >> 2];
    } else {
      r22 = r14;
    }
  } while (0);
  L1963 : do {
    if ((r22 | 0) == 0) {
      r23 = r13;
      r24 = r12, r25 = r24 >> 2;
    } else {
      r14 = r22, r6 = r14 >> 2;
      r4 = r13;
      r16 = r12;
      while (1) {
        r5 = (HEAP32[r6 + 1] & -8) - r1 | 0;
        r15 = r5 >>> 0 < r4 >>> 0;
        r19 = r15 ? r5 : r4;
        r5 = r15 ? r14 : r16;
        r15 = HEAP32[r6 + 4];
        if ((r15 | 0) != 0) {
          r14 = r15, r6 = r14 >> 2;
          r4 = r19;
          r16 = r5;
          continue;
        }
        r15 = HEAP32[r6 + 5];
        if ((r15 | 0) == 0) {
          r23 = r19;
          r24 = r5, r25 = r24 >> 2;
          break L1963;
        } else {
          r14 = r15, r6 = r14 >> 2;
          r4 = r19;
          r16 = r5;
        }
      }
    }
  } while (0);
  if ((r24 | 0) == 0) {
    r26 = 0;
    return r26;
  }
  if (r23 >>> 0 >= (HEAP32[102856] - r1 | 0) >>> 0) {
    r26 = 0;
    return r26;
  }
  r12 = r24, r13 = r12 >> 2;
  r22 = HEAP32[102858];
  if (r12 >>> 0 < r22 >>> 0) {
    _abort();
  }
  r16 = r12 + r1 | 0;
  r4 = r16;
  if (r12 >>> 0 >= r16 >>> 0) {
    _abort();
  }
  r14 = HEAP32[r25 + 6];
  r6 = HEAP32[r25 + 3];
  L1980 : do {
    if ((r6 | 0) == (r24 | 0)) {
      r5 = r24 + 20 | 0;
      r19 = HEAP32[r5 >> 2];
      do {
        if ((r19 | 0) == 0) {
          r15 = r24 + 16 | 0;
          r20 = HEAP32[r15 >> 2];
          if ((r20 | 0) == 0) {
            r27 = 0, r28 = r27 >> 2;
            break L1980;
          } else {
            r29 = r20;
            r30 = r15;
            break;
          }
        } else {
          r29 = r19;
          r30 = r5;
        }
      } while (0);
      while (1) {
        r5 = r29 + 20 | 0;
        if ((HEAP32[r5 >> 2] | 0) == 0) {
          r19 = r29 + 16 | 0;
          if ((HEAP32[r19 >> 2] | 0) == 0) {
            break;
          } else {
            r31 = r19;
          }
        } else {
          r31 = r5;
        }
        r29 = HEAP32[r31 >> 2];
        r30 = r31;
      }
      if (r30 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r30 >> 2] = 0;
        r27 = r29, r28 = r27 >> 2;
        break;
      }
    } else {
      r5 = HEAP32[r25 + 2];
      if (r5 >>> 0 < r22 >>> 0) {
        _abort();
      }
      r19 = r5 + 12 | 0;
      if ((HEAP32[r19 >> 2] | 0) != (r24 | 0)) {
        _abort();
      }
      r15 = r6 + 8 | 0;
      if ((HEAP32[r15 >> 2] | 0) == (r24 | 0)) {
        HEAP32[r19 >> 2] = r6;
        HEAP32[r15 >> 2] = r5;
        r27 = r6, r28 = r27 >> 2;
        break;
      } else {
        _abort();
      }
    }
  } while (0);
  L2004 : do {
    if ((r14 | 0) != 0) {
      r6 = r24 + 28 | 0;
      r22 = (HEAP32[r6 >> 2] << 2) + 411720 | 0;
      do {
        if ((r24 | 0) == (HEAP32[r22 >> 2] | 0)) {
          HEAP32[r22 >> 2] = r27;
          if ((r27 | 0) != 0) {
            break;
          }
          HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r6 >> 2] ^ -1);
          break L2004;
        } else {
          if (r14 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r29 = r14 + 16 | 0;
          if ((HEAP32[r29 >> 2] | 0) == (r24 | 0)) {
            HEAP32[r29 >> 2] = r27;
          } else {
            HEAP32[r14 + 20 >> 2] = r27;
          }
          if ((r27 | 0) == 0) {
            break L2004;
          }
        }
      } while (0);
      if (r27 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      }
      HEAP32[r28 + 6] = r14;
      r6 = HEAP32[r25 + 4];
      do {
        if ((r6 | 0) != 0) {
          if (r6 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r28 + 4] = r6;
            HEAP32[r6 + 24 >> 2] = r27;
            break;
          }
        }
      } while (0);
      r6 = HEAP32[r25 + 5];
      if ((r6 | 0) == 0) {
        break;
      }
      if (r6 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r28 + 5] = r6;
        HEAP32[r6 + 24 >> 2] = r27;
        break;
      }
    }
  } while (0);
  do {
    if (r23 >>> 0 < 16) {
      r27 = r23 + r1 | 0;
      HEAP32[r25 + 1] = r27 | 3;
      r28 = r27 + (r12 + 4) | 0;
      HEAP32[r28 >> 2] = HEAP32[r28 >> 2] | 1;
    } else {
      HEAP32[r25 + 1] = r1 | 3;
      HEAP32[r2 + (r13 + 1)] = r23 | 1;
      HEAP32[(r23 >> 2) + r13 + r2] = r23;
      r28 = r23 >>> 3;
      if (r23 >>> 0 < 256) {
        r27 = r28 << 1;
        r14 = (r27 << 2) + 411456 | 0;
        r6 = HEAP32[102854];
        r22 = 1 << r28;
        do {
          if ((r6 & r22 | 0) == 0) {
            HEAP32[102854] = r6 | r22;
            r32 = r14;
          } else {
            r28 = HEAP32[(r27 + 2 << 2) + 411456 >> 2];
            if (r28 >>> 0 >= HEAP32[102858] >>> 0) {
              r32 = r28;
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[(r27 + 2 << 2) + 411456 >> 2] = r4;
        HEAP32[r32 + 12 >> 2] = r4;
        HEAP32[r2 + (r13 + 2)] = r32;
        HEAP32[r2 + (r13 + 3)] = r14;
        break;
      }
      r22 = r16;
      r6 = r23 >>> 8;
      do {
        if ((r6 | 0) == 0) {
          r33 = 0;
        } else {
          if (r23 >>> 0 > 16777215) {
            r33 = 31;
            break;
          }
          r28 = (r6 + 1048320 | 0) >>> 16 & 8;
          r29 = r6 << r28;
          r30 = (r29 + 520192 | 0) >>> 16 & 4;
          r31 = r29 << r30;
          r29 = (r31 + 245760 | 0) >>> 16 & 2;
          r5 = 14 - (r30 | r28 | r29) + (r31 << r29 >>> 15) | 0;
          r33 = r23 >>> ((r5 + 7 | 0) >>> 0) & 1 | r5 << 1;
        }
      } while (0);
      r6 = (r33 << 2) + 411720 | 0;
      HEAP32[r2 + (r13 + 7)] = r33;
      HEAP32[r2 + (r13 + 5)] = 0;
      HEAP32[r2 + (r13 + 4)] = 0;
      r14 = HEAP32[102855];
      r27 = 1 << r33;
      if ((r14 & r27 | 0) == 0) {
        HEAP32[102855] = r14 | r27;
        HEAP32[r6 >> 2] = r22;
        HEAP32[r2 + (r13 + 6)] = r6;
        HEAP32[r2 + (r13 + 3)] = r22;
        HEAP32[r2 + (r13 + 2)] = r22;
        break;
      }
      if ((r33 | 0) == 31) {
        r34 = 0;
      } else {
        r34 = 25 - (r33 >>> 1) | 0;
      }
      r27 = r23 << r34;
      r14 = HEAP32[r6 >> 2];
      while (1) {
        if ((HEAP32[r14 + 4 >> 2] & -8 | 0) == (r23 | 0)) {
          break;
        }
        r35 = (r27 >>> 31 << 2) + r14 + 16 | 0;
        r6 = HEAP32[r35 >> 2];
        if ((r6 | 0) == 0) {
          r3 = 1574;
          break;
        } else {
          r27 = r27 << 1;
          r14 = r6;
        }
      }
      if (r3 == 1574) {
        if (r35 >>> 0 < HEAP32[102858] >>> 0) {
          _abort();
        } else {
          HEAP32[r35 >> 2] = r22;
          HEAP32[r2 + (r13 + 6)] = r14;
          HEAP32[r2 + (r13 + 3)] = r22;
          HEAP32[r2 + (r13 + 2)] = r22;
          break;
        }
      }
      r27 = r14 + 8 | 0;
      r6 = HEAP32[r27 >> 2];
      r5 = HEAP32[102858];
      if (r14 >>> 0 < r5 >>> 0) {
        _abort();
      }
      if (r6 >>> 0 < r5 >>> 0) {
        _abort();
      } else {
        HEAP32[r6 + 12 >> 2] = r22;
        HEAP32[r27 >> 2] = r22;
        HEAP32[r2 + (r13 + 2)] = r6;
        HEAP32[r2 + (r13 + 3)] = r14;
        HEAP32[r2 + (r13 + 6)] = 0;
        break;
      }
    }
  } while (0);
  r26 = r24 + 8 | 0;
  return r26;
}
function _sys_alloc(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26;
  r2 = 0;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  r3 = r1 + 48 | 0;
  r4 = HEAP32[102457];
  r5 = r4 + (r1 + 47) & -r4;
  if (r5 >>> 0 <= r1 >>> 0) {
    r6 = 0;
    return r6;
  }
  r4 = HEAP32[102964];
  do {
    if ((r4 | 0) != 0) {
      r7 = HEAP32[102962];
      r8 = r7 + r5 | 0;
      if (r8 >>> 0 <= r7 >>> 0 | r8 >>> 0 > r4 >>> 0) {
        r6 = 0;
      } else {
        break;
      }
      return r6;
    }
  } while (0);
  L2081 : do {
    if ((HEAP32[102965] & 4 | 0) == 0) {
      r4 = HEAP32[102860];
      do {
        if ((r4 | 0) == 0) {
          r2 = 1602;
        } else {
          r8 = _segment_holding(r4);
          if ((r8 | 0) == 0) {
            r2 = 1602;
            break;
          }
          r7 = HEAP32[102457];
          r9 = r1 + 47 - HEAP32[102857] + r7 & -r7;
          if (r9 >>> 0 >= 2147483647) {
            r10 = 0;
            break;
          }
          r7 = _sbrk(r9);
          r11 = (r7 | 0) == (HEAP32[r8 >> 2] + HEAP32[r8 + 4 >> 2] | 0);
          r12 = r11 ? r7 : -1;
          r13 = r11 ? r9 : 0;
          r14 = r7;
          r15 = r9;
          r2 = 1611;
          break;
        }
      } while (0);
      do {
        if (r2 == 1602) {
          r4 = _sbrk(0);
          if ((r4 | 0) == -1) {
            r10 = 0;
            break;
          }
          r9 = r4;
          r7 = HEAP32[102456];
          r11 = r7 - 1 | 0;
          if ((r11 & r9 | 0) == 0) {
            r16 = r5;
          } else {
            r16 = r5 - r9 + (r11 + r9 & -r7) | 0;
          }
          r7 = HEAP32[102962];
          r9 = r7 + r16 | 0;
          if (!(r16 >>> 0 > r1 >>> 0 & r16 >>> 0 < 2147483647)) {
            r10 = 0;
            break;
          }
          r11 = HEAP32[102964];
          if ((r11 | 0) != 0) {
            if (r9 >>> 0 <= r7 >>> 0 | r9 >>> 0 > r11 >>> 0) {
              r10 = 0;
              break;
            }
          }
          r11 = _sbrk(r16);
          r9 = (r11 | 0) == (r4 | 0);
          r12 = r9 ? r4 : -1;
          r13 = r9 ? r16 : 0;
          r14 = r11;
          r15 = r16;
          r2 = 1611;
          break;
        }
      } while (0);
      L2097 : do {
        if (r2 == 1611) {
          r11 = -r15 | 0;
          if ((r12 | 0) != -1) {
            r17 = r13;
            r18 = r12;
            r2 = 1622;
            break L2081;
          }
          do {
            if ((r14 | 0) != -1 & r15 >>> 0 < 2147483647 & r15 >>> 0 < r3 >>> 0) {
              r9 = HEAP32[102457];
              r4 = r1 + 47 - r15 + r9 & -r9;
              if (r4 >>> 0 >= 2147483647) {
                r19 = r15;
                break;
              }
              if ((_sbrk(r4) | 0) == -1) {
                _sbrk(r11);
                r10 = r13;
                break L2097;
              } else {
                r19 = r4 + r15 | 0;
                break;
              }
            } else {
              r19 = r15;
            }
          } while (0);
          if ((r14 | 0) == -1) {
            r10 = r13;
          } else {
            r17 = r19;
            r18 = r14;
            r2 = 1622;
            break L2081;
          }
        }
      } while (0);
      HEAP32[102965] = HEAP32[102965] | 4;
      r20 = r10;
      r2 = 1619;
      break;
    } else {
      r20 = 0;
      r2 = 1619;
    }
  } while (0);
  do {
    if (r2 == 1619) {
      if (r5 >>> 0 >= 2147483647) {
        break;
      }
      r10 = _sbrk(r5);
      r14 = _sbrk(0);
      if (!((r14 | 0) != -1 & (r10 | 0) != -1 & r10 >>> 0 < r14 >>> 0)) {
        break;
      }
      r19 = r14 - r10 | 0;
      r14 = r19 >>> 0 > (r1 + 40 | 0) >>> 0;
      r13 = r14 ? r10 : -1;
      if ((r13 | 0) == -1) {
        break;
      } else {
        r17 = r14 ? r19 : r20;
        r18 = r13;
        r2 = 1622;
        break;
      }
    }
  } while (0);
  do {
    if (r2 == 1622) {
      r20 = HEAP32[102962] + r17 | 0;
      HEAP32[102962] = r20;
      if (r20 >>> 0 > HEAP32[102963] >>> 0) {
        HEAP32[102963] = r20;
      }
      L2117 : do {
        if ((HEAP32[102860] | 0) == 0) {
          r20 = HEAP32[102858];
          if ((r20 | 0) == 0 | r18 >>> 0 < r20 >>> 0) {
            HEAP32[102858] = r18;
          }
          HEAP32[102966] = r18;
          HEAP32[102967] = r17;
          HEAP32[102969] = 0;
          HEAP32[102863] = HEAP32[102455];
          HEAP32[102862] = -1;
          _init_bins();
          _init_top(r18, r17 - 40 | 0);
        } else {
          r20 = 411864, r5 = r20 >> 2;
          while (1) {
            r21 = HEAP32[r5];
            r22 = r20 + 4 | 0;
            r23 = HEAP32[r22 >> 2];
            r24 = r21 + r23 | 0;
            if ((r18 | 0) == (r24 | 0)) {
              r2 = 1630;
              break;
            }
            r13 = HEAP32[r5 + 2];
            if ((r13 | 0) == 0) {
              break;
            } else {
              r20 = r13, r5 = r20 >> 2;
            }
          }
          do {
            if (r2 == 1630) {
              if ((HEAP32[r5 + 3] & 8 | 0) != 0) {
                break;
              }
              r20 = HEAP32[102860];
              if (!(r20 >>> 0 >= r21 >>> 0 & r20 >>> 0 < r24 >>> 0)) {
                break;
              }
              HEAP32[r22 >> 2] = r23 + r17 | 0;
              _init_top(HEAP32[102860], HEAP32[102857] + r17 | 0);
              break L2117;
            }
          } while (0);
          if (r18 >>> 0 < HEAP32[102858] >>> 0) {
            HEAP32[102858] = r18;
          }
          r5 = r18 + r17 | 0;
          r20 = 411864;
          while (1) {
            r25 = r20 | 0;
            r26 = HEAP32[r25 >> 2];
            if ((r26 | 0) == (r5 | 0)) {
              r2 = 1638;
              break;
            }
            r13 = HEAP32[r20 + 8 >> 2];
            if ((r13 | 0) == 0) {
              break;
            } else {
              r20 = r13;
            }
          }
          do {
            if (r2 == 1638) {
              if ((HEAP32[r20 + 12 >> 2] & 8 | 0) != 0) {
                break;
              }
              HEAP32[r25 >> 2] = r18;
              r5 = r20 + 4 | 0;
              HEAP32[r5 >> 2] = HEAP32[r5 >> 2] + r17 | 0;
              r6 = _prepend_alloc(r18, r26, r1);
              return r6;
            }
          } while (0);
          _add_segment(r18, r17);
        }
      } while (0);
      r20 = HEAP32[102857];
      if (r20 >>> 0 <= r1 >>> 0) {
        break;
      }
      r5 = r20 - r1 | 0;
      HEAP32[102857] = r5;
      r20 = HEAP32[102860];
      r13 = r20;
      HEAP32[102860] = r13 + r1 | 0;
      HEAP32[r1 + (r13 + 4) >> 2] = r5 | 1;
      HEAP32[r20 + 4 >> 2] = r1 | 3;
      r6 = r20 + 8 | 0;
      return r6;
    }
  } while (0);
  r1 = ___errno_location();
  HEAP32[r1 >> 2] = 12;
  r6 = 0;
  return r6;
}
function _free(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42, r43, r44;
  r2 = r1 >> 2;
  r3 = 0;
  if ((r1 | 0) == 0) {
    return;
  }
  r4 = r1 - 8 | 0;
  r5 = r4;
  r6 = HEAP32[102858];
  if (r4 >>> 0 < r6 >>> 0) {
    _abort();
  }
  r7 = HEAP32[r1 - 4 >> 2];
  r8 = r7 & 3;
  if ((r8 | 0) == 1) {
    _abort();
  }
  r9 = r7 & -8, r10 = r9 >> 2;
  r11 = r1 + (r9 - 8) | 0;
  r12 = r11;
  L2156 : do {
    if ((r7 & 1 | 0) == 0) {
      r13 = HEAP32[r4 >> 2];
      if ((r8 | 0) == 0) {
        return;
      }
      r14 = -8 - r13 | 0, r15 = r14 >> 2;
      r16 = r1 + r14 | 0;
      r17 = r16;
      r18 = r13 + r9 | 0;
      if (r16 >>> 0 < r6 >>> 0) {
        _abort();
      }
      if ((r17 | 0) == (HEAP32[102859] | 0)) {
        r19 = (r1 + (r9 - 4) | 0) >> 2;
        if ((HEAP32[r19] & 3 | 0) != 3) {
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break;
        }
        HEAP32[102856] = r18;
        HEAP32[r19] = HEAP32[r19] & -2;
        HEAP32[r15 + (r2 + 1)] = r18 | 1;
        HEAP32[r11 >> 2] = r18;
        return;
      }
      r19 = r13 >>> 3;
      if (r13 >>> 0 < 256) {
        r13 = HEAP32[r15 + (r2 + 2)];
        r23 = HEAP32[r15 + (r2 + 3)];
        r24 = (r19 << 3) + 411456 | 0;
        do {
          if ((r13 | 0) != (r24 | 0)) {
            if (r13 >>> 0 < r6 >>> 0) {
              _abort();
            }
            if ((HEAP32[r13 + 12 >> 2] | 0) == (r17 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        if ((r23 | 0) == (r13 | 0)) {
          HEAP32[102854] = HEAP32[102854] & (1 << r19 ^ -1);
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break;
        }
        do {
          if ((r23 | 0) != (r24 | 0)) {
            if (r23 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            if ((HEAP32[r23 + 8 >> 2] | 0) == (r17 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r13 + 12 >> 2] = r23;
        HEAP32[r23 + 8 >> 2] = r13;
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
      r24 = r16;
      r19 = HEAP32[r15 + (r2 + 6)];
      r25 = HEAP32[r15 + (r2 + 3)];
      L2189 : do {
        if ((r25 | 0) == (r24 | 0)) {
          r26 = r14 + (r1 + 20) | 0;
          r27 = HEAP32[r26 >> 2];
          do {
            if ((r27 | 0) == 0) {
              r28 = r14 + (r1 + 16) | 0;
              r29 = HEAP32[r28 >> 2];
              if ((r29 | 0) == 0) {
                r30 = 0, r31 = r30 >> 2;
                break L2189;
              } else {
                r32 = r29;
                r33 = r28;
                break;
              }
            } else {
              r32 = r27;
              r33 = r26;
            }
          } while (0);
          while (1) {
            r26 = r32 + 20 | 0;
            if ((HEAP32[r26 >> 2] | 0) == 0) {
              r27 = r32 + 16 | 0;
              if ((HEAP32[r27 >> 2] | 0) == 0) {
                break;
              } else {
                r34 = r27;
              }
            } else {
              r34 = r26;
            }
            r32 = HEAP32[r34 >> 2];
            r33 = r34;
          }
          if (r33 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r33 >> 2] = 0;
            r30 = r32, r31 = r30 >> 2;
            break;
          }
        } else {
          r26 = HEAP32[r15 + (r2 + 2)];
          if (r26 >>> 0 < r6 >>> 0) {
            _abort();
          }
          r27 = r26 + 12 | 0;
          if ((HEAP32[r27 >> 2] | 0) != (r24 | 0)) {
            _abort();
          }
          r28 = r25 + 8 | 0;
          if ((HEAP32[r28 >> 2] | 0) == (r24 | 0)) {
            HEAP32[r27 >> 2] = r25;
            HEAP32[r28 >> 2] = r26;
            r30 = r25, r31 = r30 >> 2;
            break;
          } else {
            _abort();
          }
        }
      } while (0);
      if ((r19 | 0) == 0) {
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
      r25 = r14 + (r1 + 28) | 0;
      r16 = (HEAP32[r25 >> 2] << 2) + 411720 | 0;
      do {
        if ((r24 | 0) == (HEAP32[r16 >> 2] | 0)) {
          HEAP32[r16 >> 2] = r30;
          if ((r30 | 0) != 0) {
            break;
          }
          HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r25 >> 2] ^ -1);
          r20 = r17, r21 = r20 >> 2;
          r22 = r18;
          break L2156;
        } else {
          if (r19 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r13 = r19 + 16 | 0;
          if ((HEAP32[r13 >> 2] | 0) == (r24 | 0)) {
            HEAP32[r13 >> 2] = r30;
          } else {
            HEAP32[r19 + 20 >> 2] = r30;
          }
          if ((r30 | 0) == 0) {
            r20 = r17, r21 = r20 >> 2;
            r22 = r18;
            break L2156;
          }
        }
      } while (0);
      if (r30 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      }
      HEAP32[r31 + 6] = r19;
      r24 = HEAP32[r15 + (r2 + 4)];
      do {
        if ((r24 | 0) != 0) {
          if (r24 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r31 + 4] = r24;
            HEAP32[r24 + 24 >> 2] = r30;
            break;
          }
        }
      } while (0);
      r24 = HEAP32[r15 + (r2 + 5)];
      if ((r24 | 0) == 0) {
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
      if (r24 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r31 + 5] = r24;
        HEAP32[r24 + 24 >> 2] = r30;
        r20 = r17, r21 = r20 >> 2;
        r22 = r18;
        break;
      }
    } else {
      r20 = r5, r21 = r20 >> 2;
      r22 = r9;
    }
  } while (0);
  r5 = r20, r30 = r5 >> 2;
  if (r5 >>> 0 >= r11 >>> 0) {
    _abort();
  }
  r5 = r1 + (r9 - 4) | 0;
  r31 = HEAP32[r5 >> 2];
  if ((r31 & 1 | 0) == 0) {
    _abort();
  }
  do {
    if ((r31 & 2 | 0) == 0) {
      if ((r12 | 0) == (HEAP32[102860] | 0)) {
        r6 = HEAP32[102857] + r22 | 0;
        HEAP32[102857] = r6;
        HEAP32[102860] = r20;
        HEAP32[r21 + 1] = r6 | 1;
        if ((r20 | 0) == (HEAP32[102859] | 0)) {
          HEAP32[102859] = 0;
          HEAP32[102856] = 0;
        }
        if (r6 >>> 0 <= HEAP32[102861] >>> 0) {
          return;
        }
        _sys_trim(0);
        return;
      }
      if ((r12 | 0) == (HEAP32[102859] | 0)) {
        r6 = HEAP32[102856] + r22 | 0;
        HEAP32[102856] = r6;
        HEAP32[102859] = r20;
        HEAP32[r21 + 1] = r6 | 1;
        HEAP32[(r6 >> 2) + r30] = r6;
        return;
      }
      r6 = (r31 & -8) + r22 | 0;
      r32 = r31 >>> 3;
      L2263 : do {
        if (r31 >>> 0 < 256) {
          r33 = HEAP32[r2 + r10];
          r34 = HEAP32[((r9 | 4) >> 2) + r2];
          r8 = (r32 << 3) + 411456 | 0;
          do {
            if ((r33 | 0) != (r8 | 0)) {
              if (r33 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              if ((HEAP32[r33 + 12 >> 2] | 0) == (r12 | 0)) {
                break;
              }
              _abort();
            }
          } while (0);
          if ((r34 | 0) == (r33 | 0)) {
            HEAP32[102854] = HEAP32[102854] & (1 << r32 ^ -1);
            break;
          }
          do {
            if ((r34 | 0) != (r8 | 0)) {
              if (r34 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              if ((HEAP32[r34 + 8 >> 2] | 0) == (r12 | 0)) {
                break;
              }
              _abort();
            }
          } while (0);
          HEAP32[r33 + 12 >> 2] = r34;
          HEAP32[r34 + 8 >> 2] = r33;
        } else {
          r8 = r11;
          r4 = HEAP32[r10 + (r2 + 4)];
          r7 = HEAP32[((r9 | 4) >> 2) + r2];
          L2283 : do {
            if ((r7 | 0) == (r8 | 0)) {
              r24 = r9 + (r1 + 12) | 0;
              r19 = HEAP32[r24 >> 2];
              do {
                if ((r19 | 0) == 0) {
                  r25 = r9 + (r1 + 8) | 0;
                  r16 = HEAP32[r25 >> 2];
                  if ((r16 | 0) == 0) {
                    r35 = 0, r36 = r35 >> 2;
                    break L2283;
                  } else {
                    r37 = r16;
                    r38 = r25;
                    break;
                  }
                } else {
                  r37 = r19;
                  r38 = r24;
                }
              } while (0);
              while (1) {
                r24 = r37 + 20 | 0;
                if ((HEAP32[r24 >> 2] | 0) == 0) {
                  r19 = r37 + 16 | 0;
                  if ((HEAP32[r19 >> 2] | 0) == 0) {
                    break;
                  } else {
                    r39 = r19;
                  }
                } else {
                  r39 = r24;
                }
                r37 = HEAP32[r39 >> 2];
                r38 = r39;
              }
              if (r38 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              } else {
                HEAP32[r38 >> 2] = 0;
                r35 = r37, r36 = r35 >> 2;
                break;
              }
            } else {
              r24 = HEAP32[r2 + r10];
              if (r24 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              r19 = r24 + 12 | 0;
              if ((HEAP32[r19 >> 2] | 0) != (r8 | 0)) {
                _abort();
              }
              r25 = r7 + 8 | 0;
              if ((HEAP32[r25 >> 2] | 0) == (r8 | 0)) {
                HEAP32[r19 >> 2] = r7;
                HEAP32[r25 >> 2] = r24;
                r35 = r7, r36 = r35 >> 2;
                break;
              } else {
                _abort();
              }
            }
          } while (0);
          if ((r4 | 0) == 0) {
            break;
          }
          r7 = r9 + (r1 + 20) | 0;
          r33 = (HEAP32[r7 >> 2] << 2) + 411720 | 0;
          do {
            if ((r8 | 0) == (HEAP32[r33 >> 2] | 0)) {
              HEAP32[r33 >> 2] = r35;
              if ((r35 | 0) != 0) {
                break;
              }
              HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r7 >> 2] ^ -1);
              break L2263;
            } else {
              if (r4 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              r34 = r4 + 16 | 0;
              if ((HEAP32[r34 >> 2] | 0) == (r8 | 0)) {
                HEAP32[r34 >> 2] = r35;
              } else {
                HEAP32[r4 + 20 >> 2] = r35;
              }
              if ((r35 | 0) == 0) {
                break L2263;
              }
            }
          } while (0);
          if (r35 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          HEAP32[r36 + 6] = r4;
          r8 = HEAP32[r10 + (r2 + 2)];
          do {
            if ((r8 | 0) != 0) {
              if (r8 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              } else {
                HEAP32[r36 + 4] = r8;
                HEAP32[r8 + 24 >> 2] = r35;
                break;
              }
            }
          } while (0);
          r8 = HEAP32[r10 + (r2 + 3)];
          if ((r8 | 0) == 0) {
            break;
          }
          if (r8 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r36 + 5] = r8;
            HEAP32[r8 + 24 >> 2] = r35;
            break;
          }
        }
      } while (0);
      HEAP32[r21 + 1] = r6 | 1;
      HEAP32[(r6 >> 2) + r30] = r6;
      if ((r20 | 0) != (HEAP32[102859] | 0)) {
        r40 = r6;
        break;
      }
      HEAP32[102856] = r6;
      return;
    } else {
      HEAP32[r5 >> 2] = r31 & -2;
      HEAP32[r21 + 1] = r22 | 1;
      HEAP32[(r22 >> 2) + r30] = r22;
      r40 = r22;
    }
  } while (0);
  r22 = r40 >>> 3;
  if (r40 >>> 0 < 256) {
    r30 = r22 << 1;
    r31 = (r30 << 2) + 411456 | 0;
    r5 = HEAP32[102854];
    r35 = 1 << r22;
    do {
      if ((r5 & r35 | 0) == 0) {
        HEAP32[102854] = r5 | r35;
        r41 = r31;
      } else {
        r22 = HEAP32[(r30 + 2 << 2) + 411456 >> 2];
        if (r22 >>> 0 >= HEAP32[102858] >>> 0) {
          r41 = r22;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[(r30 + 2 << 2) + 411456 >> 2] = r20;
    HEAP32[r41 + 12 >> 2] = r20;
    HEAP32[r21 + 2] = r41;
    HEAP32[r21 + 3] = r31;
    return;
  }
  r31 = r20;
  r41 = r40 >>> 8;
  do {
    if ((r41 | 0) == 0) {
      r42 = 0;
    } else {
      if (r40 >>> 0 > 16777215) {
        r42 = 31;
        break;
      }
      r30 = (r41 + 1048320 | 0) >>> 16 & 8;
      r35 = r41 << r30;
      r5 = (r35 + 520192 | 0) >>> 16 & 4;
      r22 = r35 << r5;
      r35 = (r22 + 245760 | 0) >>> 16 & 2;
      r36 = 14 - (r5 | r30 | r35) + (r22 << r35 >>> 15) | 0;
      r42 = r40 >>> ((r36 + 7 | 0) >>> 0) & 1 | r36 << 1;
    }
  } while (0);
  r41 = (r42 << 2) + 411720 | 0;
  HEAP32[r21 + 7] = r42;
  HEAP32[r21 + 5] = 0;
  HEAP32[r21 + 4] = 0;
  r36 = HEAP32[102855];
  r35 = 1 << r42;
  do {
    if ((r36 & r35 | 0) == 0) {
      HEAP32[102855] = r36 | r35;
      HEAP32[r41 >> 2] = r31;
      HEAP32[r21 + 6] = r41;
      HEAP32[r21 + 3] = r20;
      HEAP32[r21 + 2] = r20;
    } else {
      if ((r42 | 0) == 31) {
        r43 = 0;
      } else {
        r43 = 25 - (r42 >>> 1) | 0;
      }
      r22 = r40 << r43;
      r30 = HEAP32[r41 >> 2];
      while (1) {
        if ((HEAP32[r30 + 4 >> 2] & -8 | 0) == (r40 | 0)) {
          break;
        }
        r44 = (r22 >>> 31 << 2) + r30 + 16 | 0;
        r5 = HEAP32[r44 >> 2];
        if ((r5 | 0) == 0) {
          r3 = 1780;
          break;
        } else {
          r22 = r22 << 1;
          r30 = r5;
        }
      }
      if (r3 == 1780) {
        if (r44 >>> 0 < HEAP32[102858] >>> 0) {
          _abort();
        } else {
          HEAP32[r44 >> 2] = r31;
          HEAP32[r21 + 6] = r30;
          HEAP32[r21 + 3] = r20;
          HEAP32[r21 + 2] = r20;
          break;
        }
      }
      r22 = r30 + 8 | 0;
      r6 = HEAP32[r22 >> 2];
      r5 = HEAP32[102858];
      if (r30 >>> 0 < r5 >>> 0) {
        _abort();
      }
      if (r6 >>> 0 < r5 >>> 0) {
        _abort();
      } else {
        HEAP32[r6 + 12 >> 2] = r31;
        HEAP32[r22 >> 2] = r31;
        HEAP32[r21 + 2] = r6;
        HEAP32[r21 + 3] = r30;
        HEAP32[r21 + 6] = 0;
        break;
      }
    }
  } while (0);
  r21 = HEAP32[102862] - 1 | 0;
  HEAP32[102862] = r21;
  if ((r21 | 0) != 0) {
    return;
  }
  _release_unused_segments();
  return;
}
function _release_unused_segments() {
  var r1, r2;
  r1 = 411872;
  while (1) {
    r2 = HEAP32[r1 >> 2];
    if ((r2 | 0) == 0) {
      break;
    } else {
      r1 = r2 + 8 | 0;
    }
  }
  HEAP32[102862] = -1;
  return;
}
function _sys_trim(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  if (r1 >>> 0 >= 4294967232) {
    r2 = 0;
    r3 = r2 & 1;
    return r3;
  }
  r4 = HEAP32[102860];
  if ((r4 | 0) == 0) {
    r2 = 0;
    r3 = r2 & 1;
    return r3;
  }
  r5 = HEAP32[102857];
  do {
    if (r5 >>> 0 > (r1 + 40 | 0) >>> 0) {
      r6 = HEAP32[102457];
      r7 = Math.imul(Math.floor(((-40 - r1 - 1 + r5 + r6 | 0) >>> 0) / (r6 >>> 0)) - 1 | 0, r6);
      r8 = _segment_holding(r4), r9 = r8 >> 2;
      if ((HEAP32[r9 + 3] & 8 | 0) != 0) {
        break;
      }
      r10 = _sbrk(0);
      if ((r10 | 0) != (HEAP32[r9] + HEAP32[r9 + 1] | 0)) {
        break;
      }
      r9 = _sbrk(-(r7 >>> 0 > 2147483646 ? -2147483648 - r6 | 0 : r7) | 0);
      r7 = _sbrk(0);
      if (!((r9 | 0) != -1 & r7 >>> 0 < r10 >>> 0)) {
        break;
      }
      r9 = r10 - r7 | 0;
      if ((r10 | 0) == (r7 | 0)) {
        break;
      }
      r6 = r8 + 4 | 0;
      HEAP32[r6 >> 2] = HEAP32[r6 >> 2] - r9 | 0;
      HEAP32[102962] = HEAP32[102962] - r9 | 0;
      _init_top(HEAP32[102860], HEAP32[102857] - r9 | 0);
      r2 = (r10 | 0) != (r7 | 0);
      r3 = r2 & 1;
      return r3;
    }
  } while (0);
  if (HEAP32[102857] >>> 0 <= HEAP32[102861] >>> 0) {
    r2 = 0;
    r3 = r2 & 1;
    return r3;
  }
  HEAP32[102861] = -1;
  r2 = 0;
  r3 = r2 & 1;
  return r3;
}
function _calloc(r1, r2) {
  var r3, r4;
  do {
    if ((r1 | 0) == 0) {
      r3 = 0;
    } else {
      r4 = Math.imul(r2, r1);
      if ((r2 | r1) >>> 0 <= 65535) {
        r3 = r4;
        break;
      }
      r3 = (Math.floor((r4 >>> 0) / (r1 >>> 0)) | 0) == (r2 | 0) ? r4 : -1;
    }
  } while (0);
  r2 = _malloc(r3);
  if ((r2 | 0) == 0) {
    return r2;
  }
  if ((HEAP32[r2 - 4 >> 2] & 3 | 0) == 0) {
    return r2;
  }
  _memset(r2, 0, r3);
  return r2;
}
function _realloc(r1, r2) {
  var r3, r4, r5, r6;
  if ((r1 | 0) == 0) {
    r3 = _malloc(r2);
    return r3;
  }
  if (r2 >>> 0 > 4294967231) {
    r4 = ___errno_location();
    HEAP32[r4 >> 2] = 12;
    r3 = 0;
    return r3;
  }
  if (r2 >>> 0 < 11) {
    r5 = 16;
  } else {
    r5 = r2 + 11 & -8;
  }
  r4 = _try_realloc_chunk(r1 - 8 | 0, r5);
  if ((r4 | 0) != 0) {
    r3 = r4 + 8 | 0;
    return r3;
  }
  r4 = _malloc(r2);
  if ((r4 | 0) == 0) {
    r3 = 0;
    return r3;
  }
  r5 = HEAP32[r1 - 4 >> 2];
  r6 = (r5 & -8) - ((r5 & 3 | 0) == 0 ? 8 : 4) | 0;
  _memcpy(r4, r1, r6 >>> 0 < r2 >>> 0 ? r6 : r2);
  _free(r1);
  r3 = r4;
  return r3;
}
function _realloc_in_place(r1, r2) {
  var r3, r4;
  if ((r1 | 0) == 0) {
    return 0;
  }
  if (r2 >>> 0 > 4294967231) {
    r3 = ___errno_location();
    HEAP32[r3 >> 2] = 12;
    return 0;
  }
  if (r2 >>> 0 < 11) {
    r4 = 16;
  } else {
    r4 = r2 + 11 & -8;
  }
  r2 = r1 - 8 | 0;
  return (_try_realloc_chunk(r2, r4) | 0) == (r2 | 0) ? r1 : 0;
}
function _memalign(r1, r2) {
  var r3;
  if (r1 >>> 0 < 9) {
    r3 = _malloc(r2);
    return r3;
  } else {
    r3 = _internal_memalign(r1, r2);
    return r3;
  }
}
function _internal_memalign(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14;
  r3 = r1 >>> 0 < 16 ? 16 : r1;
  L2452 : do {
    if ((r3 - 1 & r3 | 0) == 0) {
      r4 = r3;
    } else {
      r1 = 16;
      while (1) {
        if (r1 >>> 0 < r3 >>> 0) {
          r1 = r1 << 1;
        } else {
          r4 = r1;
          break L2452;
        }
      }
    }
  } while (0);
  if ((-64 - r4 | 0) >>> 0 <= r2 >>> 0) {
    r3 = ___errno_location();
    HEAP32[r3 >> 2] = 12;
    r5 = 0;
    return r5;
  }
  if (r2 >>> 0 < 11) {
    r6 = 16;
  } else {
    r6 = r2 + 11 & -8;
  }
  r2 = _malloc(r6 + (r4 + 12) | 0);
  if ((r2 | 0) == 0) {
    r5 = 0;
    return r5;
  }
  r3 = r2 - 8 | 0;
  r1 = r3;
  r7 = r4 - 1 | 0;
  do {
    if ((r2 & r7 | 0) == 0) {
      r8 = r1;
    } else {
      r9 = r2 + r7 & -r4;
      r10 = r9 - 8 | 0;
      r11 = r3;
      if ((r10 - r11 | 0) >>> 0 > 15) {
        r12 = r10;
      } else {
        r12 = r9 + (r4 - 8) | 0;
      }
      r9 = r12;
      r10 = r12 - r11 | 0;
      r11 = (r2 - 4 | 0) >> 2;
      r13 = HEAP32[r11];
      r14 = (r13 & -8) - r10 | 0;
      if ((r13 & 3 | 0) == 0) {
        HEAP32[r12 >> 2] = HEAP32[r3 >> 2] + r10 | 0;
        HEAP32[r12 + 4 >> 2] = r14;
        r8 = r9;
        break;
      } else {
        r13 = r12 + 4 | 0;
        HEAP32[r13 >> 2] = r14 | HEAP32[r13 >> 2] & 1 | 2;
        r13 = r14 + (r12 + 4) | 0;
        HEAP32[r13 >> 2] = HEAP32[r13 >> 2] | 1;
        HEAP32[r11] = r10 | HEAP32[r11] & 1 | 2;
        r11 = r2 + (r10 - 4) | 0;
        HEAP32[r11 >> 2] = HEAP32[r11 >> 2] | 1;
        _dispose_chunk(r1, r10);
        r8 = r9;
        break;
      }
    }
  } while (0);
  r1 = r8 + 4 | 0;
  r2 = HEAP32[r1 >> 2];
  do {
    if ((r2 & 3 | 0) != 0) {
      r12 = r2 & -8;
      if (r12 >>> 0 <= (r6 + 16 | 0) >>> 0) {
        break;
      }
      r3 = r12 - r6 | 0;
      r4 = r8;
      HEAP32[r1 >> 2] = r6 | r2 & 1 | 2;
      HEAP32[r4 + (r6 | 4) >> 2] = r3 | 3;
      r7 = r4 + (r12 | 4) | 0;
      HEAP32[r7 >> 2] = HEAP32[r7 >> 2] | 1;
      _dispose_chunk(r4 + r6 | 0, r3);
    }
  } while (0);
  r5 = r8 + 8 | 0;
  return r5;
}
function _posix_memalign(r1, r2, r3) {
  var r4, r5, r6;
  do {
    if ((r2 | 0) == 8) {
      r4 = _malloc(r3);
    } else {
      r5 = r2 >>> 2;
      if ((r2 & 3 | 0) != 0 | (r5 | 0) == 0) {
        r6 = 22;
        return r6;
      }
      if ((r5 + 1073741823 & r5 | 0) != 0) {
        r6 = 22;
        return r6;
      }
      if ((-64 - r2 | 0) >>> 0 < r3 >>> 0) {
        r6 = 12;
        return r6;
      } else {
        r4 = _internal_memalign(r2 >>> 0 < 16 ? 16 : r2, r3);
        break;
      }
    }
  } while (0);
  if ((r4 | 0) == 0) {
    r6 = 12;
    return r6;
  }
  HEAP32[r1 >> 2] = r4;
  r6 = 0;
  return r6;
}
function _valloc(r1) {
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  return _memalign(HEAP32[102456], r1);
}
function _try_realloc_chunk(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29;
  r3 = (r1 + 4 | 0) >> 2;
  r4 = HEAP32[r3];
  r5 = r4 & -8, r6 = r5 >> 2;
  r7 = r1, r8 = r7 >> 2;
  r9 = r7 + r5 | 0;
  r10 = r9;
  r11 = HEAP32[102858];
  if (r7 >>> 0 < r11 >>> 0) {
    _abort();
  }
  r12 = r4 & 3;
  if (!((r12 | 0) != 1 & r7 >>> 0 < r9 >>> 0)) {
    _abort();
  }
  r13 = (r7 + (r5 | 4) | 0) >> 2;
  r14 = HEAP32[r13];
  if ((r14 & 1 | 0) == 0) {
    _abort();
  }
  if ((r12 | 0) == 0) {
    r15 = _mmap_resize(r1, r2);
    return r15;
  }
  if (r5 >>> 0 >= r2 >>> 0) {
    r12 = r5 - r2 | 0;
    if (r12 >>> 0 <= 15) {
      r15 = r1;
      return r15;
    }
    HEAP32[r3] = r4 & 1 | r2 | 2;
    HEAP32[(r2 + 4 >> 2) + r8] = r12 | 3;
    HEAP32[r13] = HEAP32[r13] | 1;
    _dispose_chunk(r7 + r2 | 0, r12);
    r15 = r1;
    return r15;
  }
  if ((r10 | 0) == (HEAP32[102860] | 0)) {
    r12 = HEAP32[102857] + r5 | 0;
    if (r12 >>> 0 <= r2 >>> 0) {
      r15 = 0;
      return r15;
    }
    r13 = r12 - r2 | 0;
    HEAP32[r3] = r4 & 1 | r2 | 2;
    HEAP32[(r2 + 4 >> 2) + r8] = r13 | 1;
    HEAP32[102860] = r7 + r2 | 0;
    HEAP32[102857] = r13;
    r15 = r1;
    return r15;
  }
  if ((r10 | 0) == (HEAP32[102859] | 0)) {
    r13 = HEAP32[102856] + r5 | 0;
    if (r13 >>> 0 < r2 >>> 0) {
      r15 = 0;
      return r15;
    }
    r12 = r13 - r2 | 0;
    if (r12 >>> 0 > 15) {
      HEAP32[r3] = r4 & 1 | r2 | 2;
      HEAP32[(r2 + 4 >> 2) + r8] = r12 | 1;
      HEAP32[(r13 >> 2) + r8] = r12;
      r16 = r13 + (r7 + 4) | 0;
      HEAP32[r16 >> 2] = HEAP32[r16 >> 2] & -2;
      r17 = r7 + r2 | 0;
      r18 = r12;
    } else {
      HEAP32[r3] = r4 & 1 | r13 | 2;
      r4 = r13 + (r7 + 4) | 0;
      HEAP32[r4 >> 2] = HEAP32[r4 >> 2] | 1;
      r17 = 0;
      r18 = 0;
    }
    HEAP32[102856] = r18;
    HEAP32[102859] = r17;
    r15 = r1;
    return r15;
  }
  if ((r14 & 2 | 0) != 0) {
    r15 = 0;
    return r15;
  }
  r17 = (r14 & -8) + r5 | 0;
  if (r17 >>> 0 < r2 >>> 0) {
    r15 = 0;
    return r15;
  }
  r18 = r17 - r2 | 0;
  r4 = r14 >>> 3;
  L2547 : do {
    if (r14 >>> 0 < 256) {
      r13 = HEAP32[r6 + (r8 + 2)];
      r12 = HEAP32[r6 + (r8 + 3)];
      r16 = (r4 << 3) + 411456 | 0;
      do {
        if ((r13 | 0) != (r16 | 0)) {
          if (r13 >>> 0 < r11 >>> 0) {
            _abort();
          }
          if ((HEAP32[r13 + 12 >> 2] | 0) == (r10 | 0)) {
            break;
          }
          _abort();
        }
      } while (0);
      if ((r12 | 0) == (r13 | 0)) {
        HEAP32[102854] = HEAP32[102854] & (1 << r4 ^ -1);
        break;
      }
      do {
        if ((r12 | 0) != (r16 | 0)) {
          if (r12 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          if ((HEAP32[r12 + 8 >> 2] | 0) == (r10 | 0)) {
            break;
          }
          _abort();
        }
      } while (0);
      HEAP32[r13 + 12 >> 2] = r12;
      HEAP32[r12 + 8 >> 2] = r13;
    } else {
      r16 = r9;
      r19 = HEAP32[r6 + (r8 + 6)];
      r20 = HEAP32[r6 + (r8 + 3)];
      L2549 : do {
        if ((r20 | 0) == (r16 | 0)) {
          r21 = r5 + (r7 + 20) | 0;
          r22 = HEAP32[r21 >> 2];
          do {
            if ((r22 | 0) == 0) {
              r23 = r5 + (r7 + 16) | 0;
              r24 = HEAP32[r23 >> 2];
              if ((r24 | 0) == 0) {
                r25 = 0, r26 = r25 >> 2;
                break L2549;
              } else {
                r27 = r24;
                r28 = r23;
                break;
              }
            } else {
              r27 = r22;
              r28 = r21;
            }
          } while (0);
          while (1) {
            r21 = r27 + 20 | 0;
            if ((HEAP32[r21 >> 2] | 0) == 0) {
              r22 = r27 + 16 | 0;
              if ((HEAP32[r22 >> 2] | 0) == 0) {
                break;
              } else {
                r29 = r22;
              }
            } else {
              r29 = r21;
            }
            r27 = HEAP32[r29 >> 2];
            r28 = r29;
          }
          if (r28 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r28 >> 2] = 0;
            r25 = r27, r26 = r25 >> 2;
            break;
          }
        } else {
          r21 = HEAP32[r6 + (r8 + 2)];
          if (r21 >>> 0 < r11 >>> 0) {
            _abort();
          }
          r22 = r21 + 12 | 0;
          if ((HEAP32[r22 >> 2] | 0) != (r16 | 0)) {
            _abort();
          }
          r23 = r20 + 8 | 0;
          if ((HEAP32[r23 >> 2] | 0) == (r16 | 0)) {
            HEAP32[r22 >> 2] = r20;
            HEAP32[r23 >> 2] = r21;
            r25 = r20, r26 = r25 >> 2;
            break;
          } else {
            _abort();
          }
        }
      } while (0);
      if ((r19 | 0) == 0) {
        break;
      }
      r20 = r5 + (r7 + 28) | 0;
      r13 = (HEAP32[r20 >> 2] << 2) + 411720 | 0;
      do {
        if ((r16 | 0) == (HEAP32[r13 >> 2] | 0)) {
          HEAP32[r13 >> 2] = r25;
          if ((r25 | 0) != 0) {
            break;
          }
          HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r20 >> 2] ^ -1);
          break L2547;
        } else {
          if (r19 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r12 = r19 + 16 | 0;
          if ((HEAP32[r12 >> 2] | 0) == (r16 | 0)) {
            HEAP32[r12 >> 2] = r25;
          } else {
            HEAP32[r19 + 20 >> 2] = r25;
          }
          if ((r25 | 0) == 0) {
            break L2547;
          }
        }
      } while (0);
      if (r25 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      }
      HEAP32[r26 + 6] = r19;
      r16 = HEAP32[r6 + (r8 + 4)];
      do {
        if ((r16 | 0) != 0) {
          if (r16 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r26 + 4] = r16;
            HEAP32[r16 + 24 >> 2] = r25;
            break;
          }
        }
      } while (0);
      r16 = HEAP32[r6 + (r8 + 5)];
      if ((r16 | 0) == 0) {
        break;
      }
      if (r16 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r26 + 5] = r16;
        HEAP32[r16 + 24 >> 2] = r25;
        break;
      }
    }
  } while (0);
  if (r18 >>> 0 < 16) {
    HEAP32[r3] = r17 | HEAP32[r3] & 1 | 2;
    r25 = r7 + (r17 | 4) | 0;
    HEAP32[r25 >> 2] = HEAP32[r25 >> 2] | 1;
    r15 = r1;
    return r15;
  } else {
    HEAP32[r3] = HEAP32[r3] & 1 | r2 | 2;
    HEAP32[(r2 + 4 >> 2) + r8] = r18 | 3;
    r8 = r7 + (r17 | 4) | 0;
    HEAP32[r8 >> 2] = HEAP32[r8 >> 2] | 1;
    _dispose_chunk(r7 + r2 | 0, r18);
    r15 = r1;
    return r15;
  }
}
function _malloc_footprint() {
  return HEAP32[102962];
}
function _malloc_max_footprint() {
  return HEAP32[102963];
}
function _malloc_footprint_limit() {
  var r1;
  r1 = HEAP32[102964];
  return (r1 | 0) == 0 ? -1 : r1;
}
function _malloc_set_footprint_limit(r1) {
  var r2, r3;
  if ((r1 | 0) == -1) {
    r2 = 0;
  } else {
    r3 = HEAP32[102457];
    r2 = r1 - 1 + r3 & -r3;
  }
  HEAP32[102964] = r2;
  return r2;
}
function _malloc_usable_size(r1) {
  var r2, r3;
  if ((r1 | 0) == 0) {
    r2 = 0;
    return r2;
  }
  r3 = HEAP32[r1 - 4 >> 2];
  r1 = r3 & 3;
  if ((r1 | 0) == 1) {
    r2 = 0;
    return r2;
  }
  r2 = (r3 & -8) - ((r1 | 0) == 0 ? 8 : 4) | 0;
  return r2;
}
function _pvalloc(r1) {
  var r2;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  r2 = HEAP32[102456];
  return _memalign(r2, r1 - 1 + r2 & -r2);
}
function _independent_calloc(r1, r2, r3) {
  var r4, r5;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r5 = r4;
  HEAP32[r5 >> 2] = r2;
  r2 = _ialloc(r1, r5, 3, r3);
  STACKTOP = r4;
  return r2;
}
function _ialloc(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  r5 = (r1 | 0) == 0;
  do {
    if ((r4 | 0) == 0) {
      if (r5) {
        r6 = _malloc(0);
        return r6;
      } else {
        r7 = r1 << 2;
        if (r7 >>> 0 < 11) {
          r8 = 0;
          r9 = 16;
          break;
        }
        r8 = 0;
        r9 = r7 + 11 & -8;
        break;
      }
    } else {
      if (r5) {
        r6 = r4;
      } else {
        r8 = r4;
        r9 = 0;
        break;
      }
      return r6;
    }
  } while (0);
  L2657 : do {
    if ((r3 & 1 | 0) == 0) {
      if ((r1 | 0) == 0) {
        r10 = 0;
        r11 = 0;
        break;
      } else {
        r12 = 0;
        r13 = 0;
      }
      while (1) {
        r4 = HEAP32[r2 + (r13 << 2) >> 2];
        if (r4 >>> 0 < 11) {
          r14 = 16;
        } else {
          r14 = r4 + 11 & -8;
        }
        r4 = r14 + r12 | 0;
        r5 = r13 + 1 | 0;
        if ((r5 | 0) == (r1 | 0)) {
          r10 = 0;
          r11 = r4;
          break L2657;
        } else {
          r12 = r4;
          r13 = r5;
        }
      }
    } else {
      r5 = HEAP32[r2 >> 2];
      if (r5 >>> 0 < 11) {
        r15 = 16;
      } else {
        r15 = r5 + 11 & -8;
      }
      r10 = r15;
      r11 = Math.imul(r15, r1);
    }
  } while (0);
  r15 = _malloc(r9 - 4 + r11 | 0);
  if ((r15 | 0) == 0) {
    r6 = 0;
    return r6;
  }
  r13 = r15 - 8 | 0;
  r12 = HEAP32[r15 - 4 >> 2] & -8;
  if ((r3 & 2 | 0) != 0) {
    _memset(r15, 0, -4 - r9 + r12 | 0);
  }
  if ((r8 | 0) == 0) {
    HEAP32[r15 + (r11 - 4) >> 2] = r12 - r11 | 3;
    r16 = r15 + r11 | 0;
    r17 = r11;
  } else {
    r16 = r8;
    r17 = r12;
  }
  HEAP32[r16 >> 2] = r15;
  r15 = r1 - 1 | 0;
  L2678 : do {
    if ((r15 | 0) == 0) {
      r18 = r13;
      r19 = r17;
    } else {
      r1 = (r10 | 0) == 0;
      r12 = r13;
      r8 = r17;
      r11 = 0;
      while (1) {
        do {
          if (r1) {
            r9 = HEAP32[r2 + (r11 << 2) >> 2];
            if (r9 >>> 0 < 11) {
              r20 = 16;
              break;
            }
            r20 = r9 + 11 & -8;
          } else {
            r20 = r10;
          }
        } while (0);
        r9 = r8 - r20 | 0;
        HEAP32[r12 + 4 >> 2] = r20 | 3;
        r3 = r12 + r20 | 0;
        r14 = r11 + 1 | 0;
        HEAP32[r16 + (r14 << 2) >> 2] = r20 + (r12 + 8) | 0;
        if ((r14 | 0) == (r15 | 0)) {
          r18 = r3;
          r19 = r9;
          break L2678;
        } else {
          r12 = r3;
          r8 = r9;
          r11 = r14;
        }
      }
    }
  } while (0);
  HEAP32[r18 + 4 >> 2] = r19 | 3;
  r6 = r16;
  return r6;
}
function _independent_comalloc(r1, r2, r3) {
  return _ialloc(r1, r2, 0, r3);
}
function _bulk_free(r1, r2) {
  _internal_bulk_free(r1, r2);
  return 0;
}
function _malloc_trim(r1) {
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  return _sys_trim(r1);
}
function _mallinfo(r1) {
  _internal_mallinfo(r1);
  return;
}
function _internal_mallinfo(r1) {
  var r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33;
  r2 = r1 >> 2;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  if ((HEAP32[102860] | 0) == 0) {
    r3 = 0;
    r4 = 0;
    r5 = 0;
    r6 = 0;
    r7 = 0;
    r8 = 0;
    r9 = 0;
  } else {
    r10 = HEAP32[102857] + 40 | 0;
    r11 = HEAP32[102860];
    r12 = 1;
    r13 = r10;
    r14 = r10;
    r10 = 411864;
    while (1) {
      r15 = (r10 | 0) >> 2;
      r16 = HEAP32[r15];
      r17 = r16 + 8 | 0;
      if ((r17 & 7 | 0) == 0) {
        r18 = 0;
      } else {
        r18 = -r17 & 7;
      }
      r17 = r16 + r18 | 0;
      r16 = HEAP32[r15];
      L2706 : do {
        if (r17 >>> 0 < r16 >>> 0) {
          r19 = r12;
          r20 = r13;
          r21 = r14;
        } else {
          r22 = HEAP32[r10 + 4 >> 2];
          r23 = r12;
          r24 = r13;
          r25 = r14;
          r26 = r17;
          r27 = r16;
          while (1) {
            if (r26 >>> 0 >= (r27 + r22 | 0) >>> 0 | (r26 | 0) == (r11 | 0)) {
              r19 = r23;
              r20 = r24;
              r21 = r25;
              break L2706;
            }
            r28 = r26 + 4 | 0;
            r29 = HEAP32[r28 >> 2];
            if ((r29 | 0) == 7) {
              r19 = r23;
              r20 = r24;
              r21 = r25;
              break L2706;
            }
            r30 = r29 & -8;
            r31 = r30 + r25 | 0;
            if ((r29 & 3 | 0) == 1) {
              r32 = r30 + r24 | 0;
              r33 = r23 + 1 | 0;
            } else {
              r32 = r24;
              r33 = r23;
            }
            r30 = r26 + (HEAP32[r28 >> 2] & -8) | 0;
            r28 = HEAP32[r15];
            if (r30 >>> 0 < r28 >>> 0) {
              r19 = r33;
              r20 = r32;
              r21 = r31;
              break L2706;
            } else {
              r23 = r33;
              r24 = r32;
              r25 = r31;
              r26 = r30;
              r27 = r28;
            }
          }
        }
      } while (0);
      r15 = HEAP32[r10 + 8 >> 2];
      if ((r15 | 0) == 0) {
        break;
      } else {
        r12 = r19;
        r13 = r20;
        r14 = r21;
        r10 = r15;
      }
    }
    r10 = HEAP32[102962];
    r3 = HEAP32[102857];
    r4 = r21;
    r5 = r19;
    r6 = r10 - r21 | 0;
    r7 = HEAP32[102963];
    r8 = r20;
    r9 = r10 - r20 | 0;
  }
  HEAP32[r2] = r4;
  HEAP32[r2 + 1] = r5;
  r5 = r1 + 8 | 0;
  HEAP32[r5 >> 2] = 0;
  HEAP32[r5 + 4 >> 2] = 0;
  HEAP32[r2 + 4] = r6;
  HEAP32[r2 + 5] = r7;
  HEAP32[r2 + 6] = 0;
  HEAP32[r2 + 7] = r9;
  HEAP32[r2 + 8] = r8;
  HEAP32[r2 + 9] = r3;
  return;
}
function _malloc_stats() {
  _internal_malloc_stats();
  return;
}
function _internal_malloc_stats() {
  var r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21;
  r1 = STACKTOP;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  L2723 : do {
    if ((HEAP32[102860] | 0) == 0) {
      r2 = 0;
      r3 = 0;
      r4 = 0;
    } else {
      r5 = HEAP32[102963];
      r6 = HEAP32[102962];
      r7 = HEAP32[102860];
      r8 = r6 - 40 - HEAP32[102857] | 0;
      r9 = 411864;
      while (1) {
        r10 = (r9 | 0) >> 2;
        r11 = HEAP32[r10];
        r12 = r11 + 8 | 0;
        if ((r12 & 7 | 0) == 0) {
          r13 = 0;
        } else {
          r13 = -r12 & 7;
        }
        r12 = r11 + r13 | 0;
        r11 = HEAP32[r10];
        L2730 : do {
          if (r12 >>> 0 < r11 >>> 0) {
            r14 = r8;
          } else {
            r15 = HEAP32[r9 + 4 >> 2];
            r16 = r8;
            r17 = r12;
            r18 = r11;
            while (1) {
              if (r17 >>> 0 >= (r18 + r15 | 0) >>> 0 | (r17 | 0) == (r7 | 0)) {
                r14 = r16;
                break L2730;
              }
              r19 = r17 + 4 | 0;
              r20 = HEAP32[r19 >> 2];
              if ((r20 | 0) == 7) {
                r14 = r16;
                break L2730;
              }
              if ((r20 & 3 | 0) == 1) {
                r21 = r16 - (r20 & -8) | 0;
              } else {
                r21 = r16;
              }
              r20 = r17 + (HEAP32[r19 >> 2] & -8) | 0;
              r19 = HEAP32[r10];
              if (r20 >>> 0 < r19 >>> 0) {
                r14 = r21;
                break L2730;
              } else {
                r16 = r21;
                r17 = r20;
                r18 = r19;
              }
            }
          }
        } while (0);
        r10 = HEAP32[r9 + 8 >> 2];
        if ((r10 | 0) == 0) {
          r2 = r14;
          r3 = r6;
          r4 = r5;
          break L2723;
        } else {
          r8 = r14;
          r9 = r10;
        }
      }
    }
  } while (0);
  _fprintf(HEAP32[_stderr >> 2], 411136, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r4, tempInt));
  _fprintf(HEAP32[_stderr >> 2], 411280, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r3, tempInt));
  _fprintf(HEAP32[_stderr >> 2], 411180, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r2, tempInt));
  STACKTOP = r1;
  return;
}
function _mallopt(r1, r2) {
  return _change_mparam(r1, r2);
}
function _change_mparam(r1, r2) {
  var r3;
  if ((HEAP32[102455] | 0) == 0) {
    _init_mparams();
  }
  do {
    if ((r1 | 0) == -2) {
      if (HEAP32[102456] >>> 0 > r2 >>> 0) {
        r3 = 0;
        break;
      }
      if ((r2 - 1 & r2 | 0) != 0) {
        r3 = 0;
        break;
      }
      HEAP32[102457] = r2;
      r3 = 1;
    } else if ((r1 | 0) == -1) {
      HEAP32[102459] = r2;
      r3 = 1;
    } else if ((r1 | 0) == -3) {
      HEAP32[102458] = r2;
      r3 = 1;
    } else {
      r3 = 0;
    }
  } while (0);
  return r3;
}
function _init_mparams() {
  var r1;
  if ((HEAP32[102455] | 0) != 0) {
    return;
  }
  r1 = _sysconf(8);
  if ((r1 - 1 & r1 | 0) != 0) {
    _abort();
  }
  HEAP32[102457] = r1;
  HEAP32[102456] = r1;
  HEAP32[102458] = -1;
  HEAP32[102459] = 2097152;
  HEAP32[102460] = 0;
  HEAP32[102965] = 0;
  r1 = _time(0) & -16 ^ 1431655768;
  HEAP32[102455] = r1;
  return;
}
function _internal_bulk_free(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14;
  r3 = 0;
  r4 = (r2 << 2) + r1 | 0;
  L2762 : do {
    if ((r2 | 0) != 0) {
      r5 = r1;
      L2763 : while (1) {
        r6 = HEAP32[r5 >> 2];
        L2765 : do {
          if ((r6 | 0) != 0) {
            r7 = r6 - 8 | 0;
            r8 = r7;
            r9 = (r6 - 4 | 0) >> 2;
            r10 = HEAP32[r9] & -8;
            HEAP32[r5 >> 2] = 0;
            if (r7 >>> 0 < HEAP32[102858] >>> 0) {
              r3 = 2131;
              break L2763;
            }
            r7 = HEAP32[r9];
            if ((r7 & 3 | 0) == 1) {
              r3 = 2132;
              break L2763;
            }
            r11 = r5 + 4 | 0;
            r12 = r7 - 8 & -8;
            do {
              if ((r11 | 0) != (r4 | 0)) {
                if ((HEAP32[r11 >> 2] | 0) != (r12 + (r6 + 8) | 0)) {
                  break;
                }
                r13 = (HEAP32[r6 + (r12 | 4) >> 2] & -8) + r10 | 0;
                HEAP32[r9] = r7 & 1 | r13 | 2;
                r14 = r6 + (r13 - 4) | 0;
                HEAP32[r14 >> 2] = HEAP32[r14 >> 2] | 1;
                HEAP32[r11 >> 2] = r6;
                break L2765;
              }
            } while (0);
            _dispose_chunk(r8, r10);
          }
        } while (0);
        r6 = r5 + 4 | 0;
        if ((r6 | 0) == (r4 | 0)) {
          break L2762;
        } else {
          r5 = r6;
        }
      }
      if (r3 == 2131) {
        _abort();
      } else if (r3 == 2132) {
        _abort();
      }
    }
  } while (0);
  if (HEAP32[102857] >>> 0 <= HEAP32[102861] >>> 0) {
    return;
  }
  _sys_trim(0);
  return;
}
function _mmap_resize(r1, r2) {
  var r3, r4;
  r3 = HEAP32[r1 + 4 >> 2] & -8;
  if (r2 >>> 0 < 256) {
    r4 = 0;
    return r4;
  }
  do {
    if (r3 >>> 0 >= (r2 + 4 | 0) >>> 0) {
      if ((r3 - r2 | 0) >>> 0 > HEAP32[102457] << 1 >>> 0) {
        break;
      } else {
        r4 = r1;
      }
      return r4;
    }
  } while (0);
  r4 = 0;
  return r4;
}
function _segment_holding(r1) {
  var r2, r3, r4, r5, r6;
  r2 = 0;
  r3 = 411864, r4 = r3 >> 2;
  while (1) {
    r5 = HEAP32[r4];
    if (r5 >>> 0 <= r1 >>> 0) {
      if ((r5 + HEAP32[r4 + 1] | 0) >>> 0 > r1 >>> 0) {
        r6 = r3;
        r2 = 2149;
        break;
      }
    }
    r5 = HEAP32[r4 + 2];
    if ((r5 | 0) == 0) {
      r6 = 0;
      r2 = 2148;
      break;
    } else {
      r3 = r5, r4 = r3 >> 2;
    }
  }
  if (r2 == 2148) {
    return r6;
  } else if (r2 == 2149) {
    return r6;
  }
}
function _dispose_chunk(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40, r41, r42;
  r3 = r2 >> 2;
  r4 = 0;
  r5 = r1, r6 = r5 >> 2;
  r7 = r5 + r2 | 0;
  r8 = r7;
  r9 = HEAP32[r1 + 4 >> 2];
  L2801 : do {
    if ((r9 & 1 | 0) == 0) {
      r10 = HEAP32[r1 >> 2];
      if ((r9 & 3 | 0) == 0) {
        return;
      }
      r11 = r5 + -r10 | 0;
      r12 = r11;
      r13 = r10 + r2 | 0;
      r14 = HEAP32[102858];
      if (r11 >>> 0 < r14 >>> 0) {
        _abort();
      }
      if ((r12 | 0) == (HEAP32[102859] | 0)) {
        r15 = (r2 + (r5 + 4) | 0) >> 2;
        if ((HEAP32[r15] & 3 | 0) != 3) {
          r16 = r12, r17 = r16 >> 2;
          r18 = r13;
          break;
        }
        HEAP32[102856] = r13;
        HEAP32[r15] = HEAP32[r15] & -2;
        HEAP32[(4 - r10 >> 2) + r6] = r13 | 1;
        HEAP32[r7 >> 2] = r13;
        return;
      }
      r15 = r10 >>> 3;
      if (r10 >>> 0 < 256) {
        r19 = HEAP32[(8 - r10 >> 2) + r6];
        r20 = HEAP32[(12 - r10 >> 2) + r6];
        r21 = (r15 << 3) + 411456 | 0;
        do {
          if ((r19 | 0) != (r21 | 0)) {
            if (r19 >>> 0 < r14 >>> 0) {
              _abort();
            }
            if ((HEAP32[r19 + 12 >> 2] | 0) == (r12 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        if ((r20 | 0) == (r19 | 0)) {
          HEAP32[102854] = HEAP32[102854] & (1 << r15 ^ -1);
          r16 = r12, r17 = r16 >> 2;
          r18 = r13;
          break;
        }
        do {
          if ((r20 | 0) != (r21 | 0)) {
            if (r20 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            if ((HEAP32[r20 + 8 >> 2] | 0) == (r12 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r19 + 12 >> 2] = r20;
        HEAP32[r20 + 8 >> 2] = r19;
        r16 = r12, r17 = r16 >> 2;
        r18 = r13;
        break;
      }
      r21 = r11;
      r15 = HEAP32[(24 - r10 >> 2) + r6];
      r22 = HEAP32[(12 - r10 >> 2) + r6];
      L2834 : do {
        if ((r22 | 0) == (r21 | 0)) {
          r23 = 16 - r10 | 0;
          r24 = r23 + (r5 + 4) | 0;
          r25 = HEAP32[r24 >> 2];
          do {
            if ((r25 | 0) == 0) {
              r26 = r5 + r23 | 0;
              r27 = HEAP32[r26 >> 2];
              if ((r27 | 0) == 0) {
                r28 = 0, r29 = r28 >> 2;
                break L2834;
              } else {
                r30 = r27;
                r31 = r26;
                break;
              }
            } else {
              r30 = r25;
              r31 = r24;
            }
          } while (0);
          while (1) {
            r24 = r30 + 20 | 0;
            if ((HEAP32[r24 >> 2] | 0) == 0) {
              r25 = r30 + 16 | 0;
              if ((HEAP32[r25 >> 2] | 0) == 0) {
                break;
              } else {
                r32 = r25;
              }
            } else {
              r32 = r24;
            }
            r30 = HEAP32[r32 >> 2];
            r31 = r32;
          }
          if (r31 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r31 >> 2] = 0;
            r28 = r30, r29 = r28 >> 2;
            break;
          }
        } else {
          r24 = HEAP32[(8 - r10 >> 2) + r6];
          if (r24 >>> 0 < r14 >>> 0) {
            _abort();
          }
          r25 = r24 + 12 | 0;
          if ((HEAP32[r25 >> 2] | 0) != (r21 | 0)) {
            _abort();
          }
          r23 = r22 + 8 | 0;
          if ((HEAP32[r23 >> 2] | 0) == (r21 | 0)) {
            HEAP32[r25 >> 2] = r22;
            HEAP32[r23 >> 2] = r24;
            r28 = r22, r29 = r28 >> 2;
            break;
          } else {
            _abort();
          }
        }
      } while (0);
      if ((r15 | 0) == 0) {
        r16 = r12, r17 = r16 >> 2;
        r18 = r13;
        break;
      }
      r22 = r5 + (28 - r10) | 0;
      r14 = (HEAP32[r22 >> 2] << 2) + 411720 | 0;
      do {
        if ((r21 | 0) == (HEAP32[r14 >> 2] | 0)) {
          HEAP32[r14 >> 2] = r28;
          if ((r28 | 0) != 0) {
            break;
          }
          HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r22 >> 2] ^ -1);
          r16 = r12, r17 = r16 >> 2;
          r18 = r13;
          break L2801;
        } else {
          if (r15 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          r11 = r15 + 16 | 0;
          if ((HEAP32[r11 >> 2] | 0) == (r21 | 0)) {
            HEAP32[r11 >> 2] = r28;
          } else {
            HEAP32[r15 + 20 >> 2] = r28;
          }
          if ((r28 | 0) == 0) {
            r16 = r12, r17 = r16 >> 2;
            r18 = r13;
            break L2801;
          }
        }
      } while (0);
      if (r28 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      }
      HEAP32[r29 + 6] = r15;
      r21 = 16 - r10 | 0;
      r22 = HEAP32[(r21 >> 2) + r6];
      do {
        if ((r22 | 0) != 0) {
          if (r22 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r29 + 4] = r22;
            HEAP32[r22 + 24 >> 2] = r28;
            break;
          }
        }
      } while (0);
      r22 = HEAP32[(r21 + 4 >> 2) + r6];
      if ((r22 | 0) == 0) {
        r16 = r12, r17 = r16 >> 2;
        r18 = r13;
        break;
      }
      if (r22 >>> 0 < HEAP32[102858] >>> 0) {
        _abort();
      } else {
        HEAP32[r29 + 5] = r22;
        HEAP32[r22 + 24 >> 2] = r28;
        r16 = r12, r17 = r16 >> 2;
        r18 = r13;
        break;
      }
    } else {
      r16 = r1, r17 = r16 >> 2;
      r18 = r2;
    }
  } while (0);
  r1 = HEAP32[102858];
  if (r7 >>> 0 < r1 >>> 0) {
    _abort();
  }
  r28 = r2 + (r5 + 4) | 0;
  r29 = HEAP32[r28 >> 2];
  do {
    if ((r29 & 2 | 0) == 0) {
      if ((r8 | 0) == (HEAP32[102860] | 0)) {
        r30 = HEAP32[102857] + r18 | 0;
        HEAP32[102857] = r30;
        HEAP32[102860] = r16;
        HEAP32[r17 + 1] = r30 | 1;
        if ((r16 | 0) != (HEAP32[102859] | 0)) {
          return;
        }
        HEAP32[102859] = 0;
        HEAP32[102856] = 0;
        return;
      }
      if ((r8 | 0) == (HEAP32[102859] | 0)) {
        r30 = HEAP32[102856] + r18 | 0;
        HEAP32[102856] = r30;
        HEAP32[102859] = r16;
        HEAP32[r17 + 1] = r30 | 1;
        HEAP32[(r30 >> 2) + r17] = r30;
        return;
      }
      r30 = (r29 & -8) + r18 | 0;
      r31 = r29 >>> 3;
      L2901 : do {
        if (r29 >>> 0 < 256) {
          r32 = HEAP32[r3 + (r6 + 2)];
          r9 = HEAP32[r3 + (r6 + 3)];
          r22 = (r31 << 3) + 411456 | 0;
          do {
            if ((r32 | 0) != (r22 | 0)) {
              if (r32 >>> 0 < r1 >>> 0) {
                _abort();
              }
              if ((HEAP32[r32 + 12 >> 2] | 0) == (r8 | 0)) {
                break;
              }
              _abort();
            }
          } while (0);
          if ((r9 | 0) == (r32 | 0)) {
            HEAP32[102854] = HEAP32[102854] & (1 << r31 ^ -1);
            break;
          }
          do {
            if ((r9 | 0) != (r22 | 0)) {
              if (r9 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              if ((HEAP32[r9 + 8 >> 2] | 0) == (r8 | 0)) {
                break;
              }
              _abort();
            }
          } while (0);
          HEAP32[r32 + 12 >> 2] = r9;
          HEAP32[r9 + 8 >> 2] = r32;
        } else {
          r22 = r7;
          r10 = HEAP32[r3 + (r6 + 6)];
          r15 = HEAP32[r3 + (r6 + 3)];
          L2903 : do {
            if ((r15 | 0) == (r22 | 0)) {
              r14 = r2 + (r5 + 20) | 0;
              r11 = HEAP32[r14 >> 2];
              do {
                if ((r11 | 0) == 0) {
                  r19 = r2 + (r5 + 16) | 0;
                  r20 = HEAP32[r19 >> 2];
                  if ((r20 | 0) == 0) {
                    r33 = 0, r34 = r33 >> 2;
                    break L2903;
                  } else {
                    r35 = r20;
                    r36 = r19;
                    break;
                  }
                } else {
                  r35 = r11;
                  r36 = r14;
                }
              } while (0);
              while (1) {
                r14 = r35 + 20 | 0;
                if ((HEAP32[r14 >> 2] | 0) == 0) {
                  r11 = r35 + 16 | 0;
                  if ((HEAP32[r11 >> 2] | 0) == 0) {
                    break;
                  } else {
                    r37 = r11;
                  }
                } else {
                  r37 = r14;
                }
                r35 = HEAP32[r37 >> 2];
                r36 = r37;
              }
              if (r36 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              } else {
                HEAP32[r36 >> 2] = 0;
                r33 = r35, r34 = r33 >> 2;
                break;
              }
            } else {
              r14 = HEAP32[r3 + (r6 + 2)];
              if (r14 >>> 0 < r1 >>> 0) {
                _abort();
              }
              r11 = r14 + 12 | 0;
              if ((HEAP32[r11 >> 2] | 0) != (r22 | 0)) {
                _abort();
              }
              r19 = r15 + 8 | 0;
              if ((HEAP32[r19 >> 2] | 0) == (r22 | 0)) {
                HEAP32[r11 >> 2] = r15;
                HEAP32[r19 >> 2] = r14;
                r33 = r15, r34 = r33 >> 2;
                break;
              } else {
                _abort();
              }
            }
          } while (0);
          if ((r10 | 0) == 0) {
            break;
          }
          r15 = r2 + (r5 + 28) | 0;
          r32 = (HEAP32[r15 >> 2] << 2) + 411720 | 0;
          do {
            if ((r22 | 0) == (HEAP32[r32 >> 2] | 0)) {
              HEAP32[r32 >> 2] = r33;
              if ((r33 | 0) != 0) {
                break;
              }
              HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r15 >> 2] ^ -1);
              break L2901;
            } else {
              if (r10 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              }
              r9 = r10 + 16 | 0;
              if ((HEAP32[r9 >> 2] | 0) == (r22 | 0)) {
                HEAP32[r9 >> 2] = r33;
              } else {
                HEAP32[r10 + 20 >> 2] = r33;
              }
              if ((r33 | 0) == 0) {
                break L2901;
              }
            }
          } while (0);
          if (r33 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          }
          HEAP32[r34 + 6] = r10;
          r22 = HEAP32[r3 + (r6 + 4)];
          do {
            if ((r22 | 0) != 0) {
              if (r22 >>> 0 < HEAP32[102858] >>> 0) {
                _abort();
              } else {
                HEAP32[r34 + 4] = r22;
                HEAP32[r22 + 24 >> 2] = r33;
                break;
              }
            }
          } while (0);
          r22 = HEAP32[r3 + (r6 + 5)];
          if ((r22 | 0) == 0) {
            break;
          }
          if (r22 >>> 0 < HEAP32[102858] >>> 0) {
            _abort();
          } else {
            HEAP32[r34 + 5] = r22;
            HEAP32[r22 + 24 >> 2] = r33;
            break;
          }
        }
      } while (0);
      HEAP32[r17 + 1] = r30 | 1;
      HEAP32[(r30 >> 2) + r17] = r30;
      if ((r16 | 0) != (HEAP32[102859] | 0)) {
        r38 = r30;
        break;
      }
      HEAP32[102856] = r30;
      return;
    } else {
      HEAP32[r28 >> 2] = r29 & -2;
      HEAP32[r17 + 1] = r18 | 1;
      HEAP32[(r18 >> 2) + r17] = r18;
      r38 = r18;
    }
  } while (0);
  r18 = r38 >>> 3;
  if (r38 >>> 0 < 256) {
    r29 = r18 << 1;
    r28 = (r29 << 2) + 411456 | 0;
    r33 = HEAP32[102854];
    r34 = 1 << r18;
    do {
      if ((r33 & r34 | 0) == 0) {
        HEAP32[102854] = r33 | r34;
        r39 = r28;
      } else {
        r18 = HEAP32[(r29 + 2 << 2) + 411456 >> 2];
        if (r18 >>> 0 >= HEAP32[102858] >>> 0) {
          r39 = r18;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[(r29 + 2 << 2) + 411456 >> 2] = r16;
    HEAP32[r39 + 12 >> 2] = r16;
    HEAP32[r17 + 2] = r39;
    HEAP32[r17 + 3] = r28;
    return;
  }
  r28 = r16;
  r39 = r38 >>> 8;
  do {
    if ((r39 | 0) == 0) {
      r40 = 0;
    } else {
      if (r38 >>> 0 > 16777215) {
        r40 = 31;
        break;
      }
      r29 = (r39 + 1048320 | 0) >>> 16 & 8;
      r34 = r39 << r29;
      r33 = (r34 + 520192 | 0) >>> 16 & 4;
      r18 = r34 << r33;
      r34 = (r18 + 245760 | 0) >>> 16 & 2;
      r6 = 14 - (r33 | r29 | r34) + (r18 << r34 >>> 15) | 0;
      r40 = r38 >>> ((r6 + 7 | 0) >>> 0) & 1 | r6 << 1;
    }
  } while (0);
  r39 = (r40 << 2) + 411720 | 0;
  HEAP32[r17 + 7] = r40;
  HEAP32[r17 + 5] = 0;
  HEAP32[r17 + 4] = 0;
  r6 = HEAP32[102855];
  r34 = 1 << r40;
  if ((r6 & r34 | 0) == 0) {
    HEAP32[102855] = r6 | r34;
    HEAP32[r39 >> 2] = r28;
    HEAP32[r17 + 6] = r39;
    HEAP32[r17 + 3] = r16;
    HEAP32[r17 + 2] = r16;
    return;
  }
  if ((r40 | 0) == 31) {
    r41 = 0;
  } else {
    r41 = 25 - (r40 >>> 1) | 0;
  }
  r40 = r38 << r41;
  r41 = HEAP32[r39 >> 2];
  while (1) {
    if ((HEAP32[r41 + 4 >> 2] & -8 | 0) == (r38 | 0)) {
      break;
    }
    r42 = (r40 >>> 31 << 2) + r41 + 16 | 0;
    r39 = HEAP32[r42 >> 2];
    if ((r39 | 0) == 0) {
      r4 = 2275;
      break;
    } else {
      r40 = r40 << 1;
      r41 = r39;
    }
  }
  if (r4 == 2275) {
    if (r42 >>> 0 < HEAP32[102858] >>> 0) {
      _abort();
    }
    HEAP32[r42 >> 2] = r28;
    HEAP32[r17 + 6] = r41;
    HEAP32[r17 + 3] = r16;
    HEAP32[r17 + 2] = r16;
    return;
  }
  r16 = r41 + 8 | 0;
  r42 = HEAP32[r16 >> 2];
  r4 = HEAP32[102858];
  if (r41 >>> 0 < r4 >>> 0) {
    _abort();
  }
  if (r42 >>> 0 < r4 >>> 0) {
    _abort();
  }
  HEAP32[r42 + 12 >> 2] = r28;
  HEAP32[r16 >> 2] = r28;
  HEAP32[r17 + 2] = r42;
  HEAP32[r17 + 3] = r41;
  HEAP32[r17 + 6] = 0;
  return;
}
function _init_top(r1, r2) {
  var r3, r4, r5;
  r3 = r1;
  r4 = r1 + 8 | 0;
  if ((r4 & 7 | 0) == 0) {
    r5 = 0;
  } else {
    r5 = -r4 & 7;
  }
  r4 = r2 - r5 | 0;
  HEAP32[102860] = r3 + r5 | 0;
  HEAP32[102857] = r4;
  HEAP32[r5 + (r3 + 4) >> 2] = r4 | 1;
  HEAP32[r2 + (r3 + 4) >> 2] = 40;
  HEAP32[102861] = HEAP32[102459];
  return;
}
function _init_bins() {
  var r1, r2, r3;
  r1 = 0;
  while (1) {
    r2 = r1 << 1;
    r3 = (r2 << 2) + 411456 | 0;
    HEAP32[(r2 + 3 << 2) + 411456 >> 2] = r3;
    HEAP32[(r2 + 2 << 2) + 411456 >> 2] = r3;
    r3 = r1 + 1 | 0;
    if ((r3 | 0) == 32) {
      break;
    } else {
      r1 = r3;
    }
  }
  return;
}
function _mmap_alloc() {}
function _prepend_alloc(r1, r2, r3) {
  var r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39, r40;
  r4 = r2 >> 2;
  r5 = r1 >> 2;
  r6 = 0;
  r7 = r1 + 8 | 0;
  if ((r7 & 7 | 0) == 0) {
    r8 = 0;
  } else {
    r8 = -r7 & 7;
  }
  r7 = r2 + 8 | 0;
  if ((r7 & 7 | 0) == 0) {
    r9 = 0, r10 = r9 >> 2;
  } else {
    r9 = -r7 & 7, r10 = r9 >> 2;
  }
  r7 = r2 + r9 | 0;
  r11 = r7;
  r12 = r8 + r3 | 0, r13 = r12 >> 2;
  r14 = r1 + r12 | 0;
  r12 = r14;
  r15 = r7 - (r1 + r8) - r3 | 0;
  HEAP32[(r8 + 4 >> 2) + r5] = r3 | 3;
  if ((r11 | 0) == (HEAP32[102860] | 0)) {
    r3 = HEAP32[102857] + r15 | 0;
    HEAP32[102857] = r3;
    HEAP32[102860] = r12;
    HEAP32[r13 + (r5 + 1)] = r3 | 1;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  if ((r11 | 0) == (HEAP32[102859] | 0)) {
    r3 = HEAP32[102856] + r15 | 0;
    HEAP32[102856] = r3;
    HEAP32[102859] = r12;
    HEAP32[r13 + (r5 + 1)] = r3 | 1;
    HEAP32[(r3 >> 2) + r5 + r13] = r3;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r3 = HEAP32[r10 + (r4 + 1)];
  if ((r3 & 3 | 0) == 1) {
    r18 = r3 & -8;
    r19 = r3 >>> 3;
    L3039 : do {
      if (r3 >>> 0 < 256) {
        r20 = HEAP32[((r9 | 8) >> 2) + r4];
        r21 = HEAP32[r10 + (r4 + 3)];
        r22 = (r19 << 3) + 411456 | 0;
        do {
          if ((r20 | 0) != (r22 | 0)) {
            if (r20 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            if ((HEAP32[r20 + 12 >> 2] | 0) == (r11 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        if ((r21 | 0) == (r20 | 0)) {
          HEAP32[102854] = HEAP32[102854] & (1 << r19 ^ -1);
          break;
        }
        do {
          if ((r21 | 0) != (r22 | 0)) {
            if (r21 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            if ((HEAP32[r21 + 8 >> 2] | 0) == (r11 | 0)) {
              break;
            }
            _abort();
          }
        } while (0);
        HEAP32[r20 + 12 >> 2] = r21;
        HEAP32[r21 + 8 >> 2] = r20;
      } else {
        r22 = r7;
        r23 = HEAP32[((r9 | 24) >> 2) + r4];
        r24 = HEAP32[r10 + (r4 + 3)];
        L3059 : do {
          if ((r24 | 0) == (r22 | 0)) {
            r25 = r9 | 16;
            r26 = r25 + (r2 + 4) | 0;
            r27 = HEAP32[r26 >> 2];
            do {
              if ((r27 | 0) == 0) {
                r28 = r2 + r25 | 0;
                r29 = HEAP32[r28 >> 2];
                if ((r29 | 0) == 0) {
                  r30 = 0, r31 = r30 >> 2;
                  break L3059;
                } else {
                  r32 = r29;
                  r33 = r28;
                  break;
                }
              } else {
                r32 = r27;
                r33 = r26;
              }
            } while (0);
            while (1) {
              r26 = r32 + 20 | 0;
              if ((HEAP32[r26 >> 2] | 0) == 0) {
                r27 = r32 + 16 | 0;
                if ((HEAP32[r27 >> 2] | 0) == 0) {
                  break;
                } else {
                  r34 = r27;
                }
              } else {
                r34 = r26;
              }
              r32 = HEAP32[r34 >> 2];
              r33 = r34;
            }
            if (r33 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            } else {
              HEAP32[r33 >> 2] = 0;
              r30 = r32, r31 = r30 >> 2;
              break;
            }
          } else {
            r26 = HEAP32[((r9 | 8) >> 2) + r4];
            if (r26 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            r27 = r26 + 12 | 0;
            if ((HEAP32[r27 >> 2] | 0) != (r22 | 0)) {
              _abort();
            }
            r25 = r24 + 8 | 0;
            if ((HEAP32[r25 >> 2] | 0) == (r22 | 0)) {
              HEAP32[r27 >> 2] = r24;
              HEAP32[r25 >> 2] = r26;
              r30 = r24, r31 = r30 >> 2;
              break;
            } else {
              _abort();
            }
          }
        } while (0);
        if ((r23 | 0) == 0) {
          break;
        }
        r24 = r9 + (r2 + 28) | 0;
        r20 = (HEAP32[r24 >> 2] << 2) + 411720 | 0;
        do {
          if ((r22 | 0) == (HEAP32[r20 >> 2] | 0)) {
            HEAP32[r20 >> 2] = r30;
            if ((r30 | 0) != 0) {
              break;
            }
            HEAP32[102855] = HEAP32[102855] & (1 << HEAP32[r24 >> 2] ^ -1);
            break L3039;
          } else {
            if (r23 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            }
            r21 = r23 + 16 | 0;
            if ((HEAP32[r21 >> 2] | 0) == (r22 | 0)) {
              HEAP32[r21 >> 2] = r30;
            } else {
              HEAP32[r23 + 20 >> 2] = r30;
            }
            if ((r30 | 0) == 0) {
              break L3039;
            }
          }
        } while (0);
        if (r30 >>> 0 < HEAP32[102858] >>> 0) {
          _abort();
        }
        HEAP32[r31 + 6] = r23;
        r22 = r9 | 16;
        r24 = HEAP32[(r22 >> 2) + r4];
        do {
          if ((r24 | 0) != 0) {
            if (r24 >>> 0 < HEAP32[102858] >>> 0) {
              _abort();
            } else {
              HEAP32[r31 + 4] = r24;
              HEAP32[r24 + 24 >> 2] = r30;
              break;
            }
          }
        } while (0);
        r24 = HEAP32[(r22 + 4 >> 2) + r4];
        if ((r24 | 0) == 0) {
          break;
        }
        if (r24 >>> 0 < HEAP32[102858] >>> 0) {
          _abort();
        } else {
          HEAP32[r31 + 5] = r24;
          HEAP32[r24 + 24 >> 2] = r30;
          break;
        }
      }
    } while (0);
    r35 = r2 + (r18 | r9) | 0;
    r36 = r18 + r15 | 0;
  } else {
    r35 = r11;
    r36 = r15;
  }
  r15 = r35 + 4 | 0;
  HEAP32[r15 >> 2] = HEAP32[r15 >> 2] & -2;
  HEAP32[r13 + (r5 + 1)] = r36 | 1;
  HEAP32[(r36 >> 2) + r5 + r13] = r36;
  r15 = r36 >>> 3;
  if (r36 >>> 0 < 256) {
    r35 = r15 << 1;
    r11 = (r35 << 2) + 411456 | 0;
    r18 = HEAP32[102854];
    r9 = 1 << r15;
    do {
      if ((r18 & r9 | 0) == 0) {
        HEAP32[102854] = r18 | r9;
        r37 = r11;
      } else {
        r15 = HEAP32[(r35 + 2 << 2) + 411456 >> 2];
        if (r15 >>> 0 >= HEAP32[102858] >>> 0) {
          r37 = r15;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[(r35 + 2 << 2) + 411456 >> 2] = r12;
    HEAP32[r37 + 12 >> 2] = r12;
    HEAP32[r13 + (r5 + 2)] = r37;
    HEAP32[r13 + (r5 + 3)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r11 = r14;
  r14 = r36 >>> 8;
  do {
    if ((r14 | 0) == 0) {
      r38 = 0;
    } else {
      if (r36 >>> 0 > 16777215) {
        r38 = 31;
        break;
      }
      r37 = (r14 + 1048320 | 0) >>> 16 & 8;
      r12 = r14 << r37;
      r35 = (r12 + 520192 | 0) >>> 16 & 4;
      r9 = r12 << r35;
      r12 = (r9 + 245760 | 0) >>> 16 & 2;
      r18 = 14 - (r35 | r37 | r12) + (r9 << r12 >>> 15) | 0;
      r38 = r36 >>> ((r18 + 7 | 0) >>> 0) & 1 | r18 << 1;
    }
  } while (0);
  r14 = (r38 << 2) + 411720 | 0;
  HEAP32[r13 + (r5 + 7)] = r38;
  HEAP32[r13 + (r5 + 5)] = 0;
  HEAP32[r13 + (r5 + 4)] = 0;
  r18 = HEAP32[102855];
  r12 = 1 << r38;
  if ((r18 & r12 | 0) == 0) {
    HEAP32[102855] = r18 | r12;
    HEAP32[r14 >> 2] = r11;
    HEAP32[r13 + (r5 + 6)] = r14;
    HEAP32[r13 + (r5 + 3)] = r11;
    HEAP32[r13 + (r5 + 2)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  if ((r38 | 0) == 31) {
    r39 = 0;
  } else {
    r39 = 25 - (r38 >>> 1) | 0;
  }
  r38 = r36 << r39;
  r39 = HEAP32[r14 >> 2];
  while (1) {
    if ((HEAP32[r39 + 4 >> 2] & -8 | 0) == (r36 | 0)) {
      break;
    }
    r40 = (r38 >>> 31 << 2) + r39 + 16 | 0;
    r14 = HEAP32[r40 >> 2];
    if ((r14 | 0) == 0) {
      r6 = 2389;
      break;
    } else {
      r38 = r38 << 1;
      r39 = r14;
    }
  }
  if (r6 == 2389) {
    if (r40 >>> 0 < HEAP32[102858] >>> 0) {
      _abort();
    }
    HEAP32[r40 >> 2] = r11;
    HEAP32[r13 + (r5 + 6)] = r39;
    HEAP32[r13 + (r5 + 3)] = r11;
    HEAP32[r13 + (r5 + 2)] = r11;
    r16 = r8 | 8;
    r17 = r1 + r16 | 0;
    return r17;
  }
  r40 = r39 + 8 | 0;
  r6 = HEAP32[r40 >> 2];
  r38 = HEAP32[102858];
  if (r39 >>> 0 < r38 >>> 0) {
    _abort();
  }
  if (r6 >>> 0 < r38 >>> 0) {
    _abort();
  }
  HEAP32[r6 + 12 >> 2] = r11;
  HEAP32[r40 >> 2] = r11;
  HEAP32[r13 + (r5 + 2)] = r6;
  HEAP32[r13 + (r5 + 3)] = r39;
  HEAP32[r13 + (r5 + 6)] = 0;
  r16 = r8 | 8;
  r17 = r1 + r16 | 0;
  return r17;
}
function _add_segment(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r3 = 0;
  r4 = HEAP32[102860], r5 = r4 >> 2;
  r6 = r4;
  r7 = _segment_holding(r6);
  r8 = HEAP32[r7 >> 2];
  r9 = HEAP32[r7 + 4 >> 2];
  r7 = r8 + r9 | 0;
  r10 = r8 + (r9 - 39) | 0;
  if ((r10 & 7 | 0) == 0) {
    r11 = 0;
  } else {
    r11 = -r10 & 7;
  }
  r10 = r8 + (r9 - 47) + r11 | 0;
  r11 = r10 >>> 0 < (r4 + 16 | 0) >>> 0 ? r6 : r10;
  r10 = r11 + 8 | 0, r9 = r10 >> 2;
  _init_top(r1, r2 - 40 | 0);
  HEAP32[r11 + 4 >> 2] = 27;
  HEAP32[r9] = HEAP32[102966];
  HEAP32[r9 + 1] = HEAP32[102967];
  HEAP32[r9 + 2] = HEAP32[102968];
  HEAP32[r9 + 3] = HEAP32[102969];
  HEAP32[102966] = r1;
  HEAP32[102967] = r2;
  HEAP32[102969] = 0;
  HEAP32[102968] = r10;
  r10 = r11 + 28 | 0;
  HEAP32[r10 >> 2] = 7;
  L3152 : do {
    if ((r11 + 32 | 0) >>> 0 < r7 >>> 0) {
      r2 = r10;
      while (1) {
        r1 = r2 + 4 | 0;
        HEAP32[r1 >> 2] = 7;
        if ((r2 + 8 | 0) >>> 0 < r7 >>> 0) {
          r2 = r1;
        } else {
          break L3152;
        }
      }
    }
  } while (0);
  if ((r11 | 0) == (r6 | 0)) {
    return;
  }
  r7 = r11 - r4 | 0;
  r11 = r7 + (r6 + 4) | 0;
  HEAP32[r11 >> 2] = HEAP32[r11 >> 2] & -2;
  HEAP32[r5 + 1] = r7 | 1;
  HEAP32[r6 + r7 >> 2] = r7;
  r6 = r7 >>> 3;
  if (r7 >>> 0 < 256) {
    r11 = r6 << 1;
    r10 = (r11 << 2) + 411456 | 0;
    r2 = HEAP32[102854];
    r1 = 1 << r6;
    do {
      if ((r2 & r1 | 0) == 0) {
        HEAP32[102854] = r2 | r1;
        r12 = r10;
      } else {
        r6 = HEAP32[(r11 + 2 << 2) + 411456 >> 2];
        if (r6 >>> 0 >= HEAP32[102858] >>> 0) {
          r12 = r6;
          break;
        }
        _abort();
      }
    } while (0);
    HEAP32[(r11 + 2 << 2) + 411456 >> 2] = r4;
    HEAP32[r12 + 12 >> 2] = r4;
    HEAP32[r5 + 2] = r12;
    HEAP32[r5 + 3] = r10;
    return;
  }
  r10 = r4;
  r12 = r7 >>> 8;
  do {
    if ((r12 | 0) == 0) {
      r13 = 0;
    } else {
      if (r7 >>> 0 > 16777215) {
        r13 = 31;
        break;
      }
      r11 = (r12 + 1048320 | 0) >>> 16 & 8;
      r1 = r12 << r11;
      r2 = (r1 + 520192 | 0) >>> 16 & 4;
      r6 = r1 << r2;
      r1 = (r6 + 245760 | 0) >>> 16 & 2;
      r9 = 14 - (r2 | r11 | r1) + (r6 << r1 >>> 15) | 0;
      r13 = r7 >>> ((r9 + 7 | 0) >>> 0) & 1 | r9 << 1;
    }
  } while (0);
  r12 = (r13 << 2) + 411720 | 0;
  HEAP32[r5 + 7] = r13;
  HEAP32[r5 + 5] = 0;
  HEAP32[r5 + 4] = 0;
  r9 = HEAP32[102855];
  r1 = 1 << r13;
  if ((r9 & r1 | 0) == 0) {
    HEAP32[102855] = r9 | r1;
    HEAP32[r12 >> 2] = r10;
    HEAP32[r5 + 6] = r12;
    HEAP32[r5 + 3] = r4;
    HEAP32[r5 + 2] = r4;
    return;
  }
  if ((r13 | 0) == 31) {
    r14 = 0;
  } else {
    r14 = 25 - (r13 >>> 1) | 0;
  }
  r13 = r7 << r14;
  r14 = HEAP32[r12 >> 2];
  while (1) {
    if ((HEAP32[r14 + 4 >> 2] & -8 | 0) == (r7 | 0)) {
      break;
    }
    r15 = (r13 >>> 31 << 2) + r14 + 16 | 0;
    r12 = HEAP32[r15 >> 2];
    if ((r12 | 0) == 0) {
      r3 = 2433;
      break;
    } else {
      r13 = r13 << 1;
      r14 = r12;
    }
  }
  if (r3 == 2433) {
    if (r15 >>> 0 < HEAP32[102858] >>> 0) {
      _abort();
    }
    HEAP32[r15 >> 2] = r10;
    HEAP32[r5 + 6] = r14;
    HEAP32[r5 + 3] = r4;
    HEAP32[r5 + 2] = r4;
    return;
  }
  r4 = r14 + 8 | 0;
  r15 = HEAP32[r4 >> 2];
  r3 = HEAP32[102858];
  if (r14 >>> 0 < r3 >>> 0) {
    _abort();
  }
  if (r15 >>> 0 < r3 >>> 0) {
    _abort();
  }
  HEAP32[r15 + 12 >> 2] = r10;
  HEAP32[r4 >> 2] = r10;
  HEAP32[r5 + 2] = r15;
  HEAP32[r5 + 3] = r14;
  HEAP32[r5 + 6] = 0;
  return;
}
function __ZNKSt9bad_alloc4whatEv(r1) {
  return 411164;
}
function __ZNKSt20bad_array_new_length4whatEv(r1) {
  return 411308;
}
function __ZSt15get_new_handlerv() {
  return tempValue = HEAP32[103002], HEAP32[103002] = tempValue, tempValue;
}
function __ZSt15set_new_handlerPFvvE(r1) {
  return tempValue = HEAP32[103002], HEAP32[103002] = r1, tempValue;
}
function __ZNSt9bad_allocC2Ev(r1) {
  HEAP32[r1 >> 2] = 411896;
  return;
}
function __ZdlPv(r1) {
  if ((r1 | 0) == 0) {
    return;
  }
  _free(r1);
  return;
}
function __ZdlPvRKSt9nothrow_t(r1, r2) {
  __ZdlPv(r1);
  return;
}
function __ZdaPv(r1) {
  __ZdlPv(r1);
  return;
}
function __ZdaPvRKSt9nothrow_t(r1, r2) {
  __ZdaPv(r1);
  return;
}
function __ZNSt9bad_allocD0Ev(r1) {
  __ZNSt9bad_allocD2Ev(r1);
  __ZdlPv(r1);
  return;
}
function __ZNSt9bad_allocD2Ev(r1) {
  return;
}
function __ZNSt20bad_array_new_lengthC2Ev(r1) {
  __ZNSt9bad_allocC2Ev(r1 | 0);
  HEAP32[r1 >> 2] = 411920;
  return;
}
function __ZNSt20bad_array_new_lengthD0Ev(r1) {
  __ZNSt9bad_allocD2Ev(r1 | 0);
  __ZdlPv(r1);
  return;
}
function _getopt(r1, r2, r3) {
  return _getopt_internal(r1, r2, r3, 0, 0, 0);
}
function _getopt_internal(r1, r2, r3, r4, r5, r6) {
  var r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r7 = r2 >> 2;
  r8 = 0;
  r9 = STACKTOP;
  if ((r3 | 0) == 0) {
    r10 = -1;
    STACKTOP = r9;
    return r10;
  }
  if ((HEAP32[102440] | 0) == 0) {
    HEAP32[102438] = 1;
    HEAP32[102440] = 1;
  }
  if ((HEAP32[102478] | 0) == -1 | (HEAP32[102438] | 0) != 0) {
    r11 = (_getenv(411120) | 0) != 0 & 1;
    HEAP32[102478] = r11;
  }
  r11 = HEAP8[r3];
  if (r11 << 24 >> 24 == 45) {
    r12 = r6 | 2;
  } else {
    r12 = (HEAP32[102478] | 0) != 0 | r11 << 24 >> 24 == 43 ? r6 & -2 : r6;
  }
  r6 = HEAP8[r3];
  if (r6 << 24 >> 24 == 43 | r6 << 24 >> 24 == 45) {
    r13 = r3 + 1 | 0;
  } else {
    r13 = r3;
  }
  HEAP32[102442] = 0;
  do {
    if ((HEAP32[102438] | 0) == 0) {
      r8 = 2479;
    } else {
      HEAP32[102444] = -1;
      HEAP32[102443] = -1;
      r8 = 2478;
      break;
    }
  } while (0);
  while (1) {
    if (r8 == 2479) {
      r8 = 0;
      if ((HEAP8[HEAP32[102437]] | 0) != 0) {
        break;
      }
    } else if (r8 == 2478) {
      r8 = 0;
      if ((HEAP32[102438] | 0) == 0) {
        r8 = 2479;
        continue;
      }
    }
    HEAP32[102438] = 0;
    r3 = HEAP32[102440];
    if ((r3 | 0) >= (r1 | 0)) {
      r8 = 2481;
      break;
    }
    r6 = HEAP32[(r3 << 2 >> 2) + r7];
    HEAP32[102437] = r6;
    if ((HEAP8[r6] | 0) == 45) {
      if ((HEAP8[r6 + 1 | 0] | 0) != 0) {
        r8 = 2497;
        break;
      }
      if ((_strchr(r13, 45) | 0) != 0) {
        r8 = 2497;
        break;
      }
    }
    HEAP32[102437] = 411268;
    if ((r12 & 2 | 0) != 0) {
      r8 = 2490;
      break;
    }
    if ((r12 & 1 | 0) == 0) {
      r10 = -1;
      r8 = 2558;
      break;
    }
    r6 = HEAP32[102443];
    do {
      if ((r6 | 0) == -1) {
        HEAP32[102443] = HEAP32[102440];
      } else {
        r3 = HEAP32[102444];
        if ((r3 | 0) == -1) {
          break;
        }
        _permute_args(r6, r3, HEAP32[102440], r2);
        HEAP32[102443] = HEAP32[102440] - HEAP32[102444] + HEAP32[102443] | 0;
        HEAP32[102444] = -1;
      }
    } while (0);
    HEAP32[102440] = HEAP32[102440] + 1 | 0;
    r8 = 2478;
    continue;
  }
  do {
    if (r8 == 2497) {
      if ((HEAP32[102443] | 0) != -1 & (HEAP32[102444] | 0) == -1) {
        HEAP32[102444] = HEAP32[102440];
      }
      r6 = HEAP32[102437];
      r3 = r6 + 1 | 0;
      if ((HEAP8[r3] | 0) == 0) {
        break;
      }
      HEAP32[102437] = r3;
      if ((HEAP8[r3] | 0) != 45) {
        break;
      }
      if ((HEAP8[r6 + 2 | 0] | 0) != 0) {
        break;
      }
      HEAP32[102440] = HEAP32[102440] + 1 | 0;
      HEAP32[102437] = 411268;
      r6 = HEAP32[102444];
      if ((r6 | 0) != -1) {
        _permute_args(HEAP32[102443], r6, HEAP32[102440], r2);
        HEAP32[102440] = HEAP32[102443] - HEAP32[102444] + HEAP32[102440] | 0;
      }
      HEAP32[102444] = -1;
      HEAP32[102443] = -1;
      r10 = -1;
      STACKTOP = r9;
      return r10;
    } else if (r8 == 2481) {
      HEAP32[102437] = 411268;
      r6 = HEAP32[102444];
      r3 = HEAP32[102443];
      do {
        if ((r6 | 0) == -1) {
          if ((r3 | 0) == -1) {
            break;
          }
          HEAP32[102440] = r3;
        } else {
          _permute_args(r3, r6, HEAP32[102440], r2);
          HEAP32[102440] = HEAP32[102443] - HEAP32[102444] + HEAP32[102440] | 0;
        }
      } while (0);
      HEAP32[102444] = -1;
      HEAP32[102443] = -1;
      r10 = -1;
      STACKTOP = r9;
      return r10;
    } else if (r8 == 2490) {
      r6 = HEAP32[102440];
      HEAP32[102440] = r6 + 1 | 0;
      HEAP32[102442] = HEAP32[(r6 << 2 >> 2) + r7];
      r10 = 1;
      STACKTOP = r9;
      return r10;
    } else if (r8 == 2558) {
      STACKTOP = r9;
      return r10;
    }
  } while (0);
  r6 = (r4 | 0) != 0;
  do {
    if (r6) {
      r3 = HEAP32[102437];
      if ((r3 | 0) == (HEAP32[(HEAP32[102440] << 2 >> 2) + r7] | 0)) {
        break;
      }
      if ((HEAP8[r3] | 0) != 45) {
        if ((r12 & 4 | 0) == 0) {
          break;
        }
      }
      r3 = HEAP32[102437];
      r11 = HEAP8[r3];
      if (r11 << 24 >> 24 == 58) {
        r14 = 0;
      } else if (r11 << 24 >> 24 == 45) {
        HEAP32[102437] = r3 + 1 | 0;
        r14 = 0;
      } else {
        r14 = (_strchr(r13, r11 << 24 >> 24) | 0) != 0 & 1;
      }
      r11 = _parse_long_options(r2, r13, r4, r5, r14);
      if ((r11 | 0) == -1) {
        break;
      }
      HEAP32[102437] = 411268;
      r10 = r11;
      STACKTOP = r9;
      return r10;
    }
  } while (0);
  r14 = HEAP32[102437];
  r12 = r14 + 1 | 0;
  HEAP32[102437] = r12;
  r11 = HEAP8[r14];
  r14 = r11 << 24 >> 24;
  do {
    if (r11 << 24 >> 24 == 45) {
      if ((HEAP8[r12] | 0) == 0) {
        r8 = 2516;
        break;
      } else {
        r8 = 2518;
        break;
      }
    } else if (r11 << 24 >> 24 != 58) {
      r8 = 2516;
    }
  } while (0);
  do {
    if (r8 == 2516) {
      r12 = _strchr(r13, r14);
      if ((r12 | 0) == 0) {
        if (r11 << 24 >> 24 == 45) {
          r8 = 2518;
          break;
        } else {
          break;
        }
      }
      do {
        if (r6 & r11 << 24 >> 24 == 87) {
          if ((HEAP8[r12 + 1 | 0] | 0) != 59) {
            break;
          }
          do {
            if ((HEAP8[HEAP32[102437]] | 0) == 0) {
              r3 = HEAP32[102440] + 1 | 0;
              HEAP32[102440] = r3;
              if ((r3 | 0) < (r1 | 0)) {
                HEAP32[102437] = HEAP32[(r3 << 2 >> 2) + r7];
                break;
              }
              HEAP32[102437] = 411268;
              do {
                if ((HEAP32[102441] | 0) != 0) {
                  if ((HEAP8[r13] | 0) == 58) {
                    break;
                  }
                  __warnx(409640, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r14, tempInt));
                }
              } while (0);
              HEAP32[102439] = r14;
              r10 = (HEAP8[r13] | 0) == 58 ? 58 : 63;
              STACKTOP = r9;
              return r10;
            }
          } while (0);
          r3 = _parse_long_options(r2, r13, r4, r5, 0);
          HEAP32[102437] = 411268;
          r10 = r3;
          STACKTOP = r9;
          return r10;
        }
      } while (0);
      if ((HEAP8[r12 + 1 | 0] | 0) != 58) {
        if ((HEAP8[HEAP32[102437]] | 0) != 0) {
          r10 = r14;
          STACKTOP = r9;
          return r10;
        }
        HEAP32[102440] = HEAP32[102440] + 1 | 0;
        r10 = r14;
        STACKTOP = r9;
        return r10;
      }
      HEAP32[102442] = 0;
      r3 = HEAP32[102437];
      do {
        if ((HEAP8[r3] | 0) == 0) {
          if ((HEAP8[r12 + 2 | 0] | 0) == 58) {
            break;
          }
          r15 = HEAP32[102440] + 1 | 0;
          HEAP32[102440] = r15;
          if ((r15 | 0) < (r1 | 0)) {
            HEAP32[102442] = HEAP32[(r15 << 2 >> 2) + r7];
            break;
          }
          HEAP32[102437] = 411268;
          do {
            if ((HEAP32[102441] | 0) != 0) {
              if ((HEAP8[r13] | 0) == 58) {
                break;
              }
              __warnx(409640, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r14, tempInt));
            }
          } while (0);
          HEAP32[102439] = r14;
          r10 = (HEAP8[r13] | 0) == 58 ? 58 : 63;
          STACKTOP = r9;
          return r10;
        } else {
          HEAP32[102442] = r3;
        }
      } while (0);
      HEAP32[102437] = 411268;
      HEAP32[102440] = HEAP32[102440] + 1 | 0;
      r10 = r14;
      STACKTOP = r9;
      return r10;
    }
  } while (0);
  do {
    if (r8 == 2518) {
      if ((HEAP8[HEAP32[102437]] | 0) == 0) {
        r10 = -1;
      } else {
        break;
      }
      STACKTOP = r9;
      return r10;
    }
  } while (0);
  if ((HEAP8[HEAP32[102437]] | 0) == 0) {
    HEAP32[102440] = HEAP32[102440] + 1 | 0;
  }
  do {
    if ((HEAP32[102441] | 0) != 0) {
      if ((HEAP8[r13] | 0) == 58) {
        break;
      }
      __warnx(409888, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r14, tempInt));
    }
  } while (0);
  HEAP32[102439] = r14;
  r10 = 63;
  STACKTOP = r9;
  return r10;
}
function _getopt_long(r1, r2, r3, r4, r5) {
  return _getopt_internal(r1, r2, r3, r4, r5, 1);
}
function _getopt_long_only(r1, r2, r3, r4, r5) {
  return _getopt_internal(r1, r2, r3, r4, r5, 5);
}
function _permute_args(r1, r2, r3, r4) {
  var r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15;
  r5 = r2 - r1 | 0;
  r6 = r3 - r2 | 0;
  r7 = _gcd(r5, r6);
  r8 = (r3 - r1 | 0) / (r7 | 0) & -1;
  if ((r7 | 0) <= 0) {
    return;
  }
  r1 = (r8 | 0) > 0;
  r3 = -r5 | 0;
  r5 = 0;
  while (1) {
    r9 = r5 + r2 | 0;
    L3350 : do {
      if (r1) {
        r10 = (r9 << 2) + r4 | 0;
        r11 = 0;
        r12 = r9;
        while (1) {
          r13 = ((r12 | 0) < (r2 | 0) ? r6 : r3) + r12 | 0;
          r14 = (r13 << 2) + r4 | 0;
          r15 = HEAP32[r14 >> 2];
          HEAP32[r14 >> 2] = HEAP32[r10 >> 2];
          HEAP32[r10 >> 2] = r15;
          r15 = r11 + 1 | 0;
          if ((r15 | 0) == (r8 | 0)) {
            break L3350;
          } else {
            r11 = r15;
            r12 = r13;
          }
        }
      }
    } while (0);
    r9 = r5 + 1 | 0;
    if ((r9 | 0) == (r7 | 0)) {
      break;
    } else {
      r5 = r9;
    }
  }
  return;
}
function __Znwj(r1) {
  var r2, r3, r4;
  r2 = 0;
  r3 = (r1 | 0) == 0 ? 1 : r1;
  while (1) {
    r4 = _malloc(r3);
    if ((r4 | 0) != 0) {
      r2 = 2583;
      break;
    }
    r1 = __ZSt15get_new_handlerv();
    if ((r1 | 0) == 0) {
      break;
    }
    FUNCTION_TABLE[r1]();
  }
  if (r2 == 2583) {
    return r4;
  }
  r4 = ___cxa_allocate_exception(4);
  __ZNSt9bad_allocC2Ev(r4);
  ___cxa_throw(r4, 411980, 36);
}
function __ZnwjRKSt9nothrow_t(r1, r2) {
  return __Znwj(r1);
}
function __Znaj(r1) {
  return __Znwj(r1);
}
function __ZnajRKSt9nothrow_t(r1, r2) {
  return __Znaj(r1);
}
function __ZSt17__throw_bad_allocv() {
  var r1;
  r1 = ___cxa_allocate_exception(4);
  __ZNSt9bad_allocC2Ev(r1);
  ___cxa_throw(r1, 411980, 36);
}
function _gcd(r1, r2) {
  var r3, r4, r5, r6;
  r3 = (r1 | 0) % (r2 | 0);
  if ((r3 | 0) == 0) {
    r4 = r2;
    return r4;
  } else {
    r5 = r2;
    r6 = r3;
  }
  while (1) {
    r3 = (r5 | 0) % (r6 | 0);
    if ((r3 | 0) == 0) {
      r4 = r6;
      break;
    } else {
      r5 = r6;
      r6 = r3;
    }
  }
  return r4;
}
function _parse_long_options(r1, r2, r3, r4, r5) {
  var r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23;
  r6 = r3 >> 2;
  r7 = 0;
  r8 = STACKTOP;
  r9 = HEAP32[102437];
  HEAP32[102440] = HEAP32[102440] + 1 | 0;
  r10 = _strchr(r9, 61);
  if ((r10 | 0) == 0) {
    r11 = _strlen(r9);
    r12 = 0;
  } else {
    r11 = r10 - r9 | 0;
    r12 = r10 + 1 | 0;
  }
  r10 = HEAP32[r6];
  do {
    if ((r10 | 0) != 0) {
      r13 = (r5 | 0) != 0 & (r11 | 0) == 1;
      r14 = 0;
      r15 = -1;
      r16 = r10;
      L3385 : while (1) {
        do {
          if ((_strncmp(r9, r16, r11) | 0) == 0) {
            if ((_strlen(r16) | 0) == (r11 | 0)) {
              r17 = r14;
              break L3385;
            }
            if (r13) {
              r18 = r15;
              break;
            }
            if ((r15 | 0) == -1) {
              r18 = r14;
            } else {
              r7 = 2614;
              break L3385;
            }
          } else {
            r18 = r15;
          }
        } while (0);
        r19 = r14 + 1 | 0;
        r20 = HEAP32[(r19 << 4 >> 2) + r6];
        if ((r20 | 0) == 0) {
          r17 = r18;
          break;
        } else {
          r14 = r19;
          r15 = r18;
          r16 = r20;
        }
      }
      if (r7 == 2614) {
        do {
          if ((HEAP32[102441] | 0) != 0) {
            if ((HEAP8[r2] | 0) == 58) {
              break;
            }
            __warnx(411084, (tempInt = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempInt >> 2] = r11, HEAP32[tempInt + 4 >> 2] = r9, tempInt));
          }
        } while (0);
        HEAP32[102439] = 0;
        r21 = 63;
        STACKTOP = r8;
        return r21;
      }
      if ((r17 | 0) == -1) {
        break;
      }
      r16 = (r17 << 4) + r3 + 4 | 0;
      r15 = HEAP32[r16 >> 2];
      r14 = (r12 | 0) == 0;
      if (!((r15 | 0) != 0 | r14)) {
        do {
          if ((HEAP32[102441] | 0) != 0) {
            if ((HEAP8[r2] | 0) == 58) {
              break;
            }
            __warnx(409780, (tempInt = STACKTOP, STACKTOP = STACKTOP + 8 | 0, HEAP32[tempInt >> 2] = r11, HEAP32[tempInt + 4 >> 2] = r9, tempInt));
          }
        } while (0);
        if ((HEAP32[((r17 << 4) + 8 >> 2) + r6] | 0) == 0) {
          r22 = HEAP32[((r17 << 4) + 12 >> 2) + r6];
        } else {
          r22 = 0;
        }
        HEAP32[102439] = r22;
        r21 = (HEAP8[r2] | 0) == 58 ? 58 : 63;
        STACKTOP = r8;
        return r21;
      }
      do {
        if ((r15 - 1 | 0) >>> 0 < 2) {
          if (!r14) {
            HEAP32[102442] = r12;
            break;
          }
          if ((r15 | 0) != 1) {
            break;
          }
          r13 = HEAP32[102440];
          HEAP32[102440] = r13 + 1 | 0;
          HEAP32[102442] = HEAP32[r1 + (r13 << 2) >> 2];
        }
      } while (0);
      if (!((HEAP32[r16 >> 2] | 0) == 1 & (HEAP32[102442] | 0) == 0)) {
        if ((r4 | 0) != 0) {
          HEAP32[r4 >> 2] = r17;
        }
        r15 = HEAP32[((r17 << 4) + 8 >> 2) + r6];
        r14 = HEAP32[((r17 << 4) + 12 >> 2) + r6];
        if ((r15 | 0) == 0) {
          r21 = r14;
          STACKTOP = r8;
          return r21;
        }
        HEAP32[r15 >> 2] = r14;
        r21 = 0;
        STACKTOP = r8;
        return r21;
      }
      do {
        if ((HEAP32[102441] | 0) != 0) {
          if ((HEAP8[r2] | 0) == 58) {
            break;
          }
          __warnx(409604, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r9, tempInt));
        }
      } while (0);
      if ((HEAP32[((r17 << 4) + 8 >> 2) + r6] | 0) == 0) {
        r23 = HEAP32[((r17 << 4) + 12 >> 2) + r6];
      } else {
        r23 = 0;
      }
      HEAP32[102439] = r23;
      HEAP32[102440] = HEAP32[102440] - 1 | 0;
      r21 = (HEAP8[r2] | 0) == 58 ? 58 : 63;
      STACKTOP = r8;
      return r21;
    }
  } while (0);
  if ((r5 | 0) != 0) {
    HEAP32[102440] = HEAP32[102440] - 1 | 0;
    r21 = -1;
    STACKTOP = r8;
    return r21;
  }
  do {
    if ((HEAP32[102441] | 0) != 0) {
      if ((HEAP8[r2] | 0) == 58) {
        break;
      }
      __warnx(409864, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r9, tempInt));
    }
  } while (0);
  HEAP32[102439] = 0;
  r21 = 63;
  STACKTOP = r8;
  return r21;
}
function __warn(r1, r2) {
  var r3, r4;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r4 = r3;
  HEAP32[r4 >> 2] = r2;
  __vwarn(r1, HEAP32[r4 >> 2]);
  STACKTOP = r3;
  return;
}
function __warnx(r1, r2) {
  var r3, r4;
  r3 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r4 = r3;
  HEAP32[r4 >> 2] = r2;
  __vwarnx(r1, HEAP32[r4 >> 2]);
  STACKTOP = r3;
  return;
}
function __vwarn(r1, r2) {
  var r3, r4, r5;
  r3 = STACKTOP;
  r4 = ___errno_location();
  r5 = HEAP32[r4 >> 2];
  r4 = HEAP32[___progname >> 2];
  _fprintf(HEAP32[_stderr >> 2], 411260, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r4, tempInt));
  if ((r1 | 0) != 0) {
    _fprintf(HEAP32[_stderr >> 2], r1, r2);
    _fwrite(411336, 2, 1, HEAP32[_stderr >> 2]);
  }
  r2 = HEAP32[_stderr >> 2];
  r1 = _strerror(r5);
  _fprintf(r2, 411216, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r1, tempInt));
  STACKTOP = r3;
  return;
}
function __vwarnx(r1, r2) {
  var r3, r4;
  r3 = STACKTOP;
  r4 = HEAP32[___progname >> 2];
  _fprintf(HEAP32[_stderr >> 2], 411208, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r4, tempInt));
  if ((r1 | 0) != 0) {
    _fprintf(HEAP32[_stderr >> 2], r1, r2);
  }
  _fputc(10, HEAP32[_stderr >> 2]);
  STACKTOP = r3;
  return;
}
function _strtod(r1, r2) {
  var r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24, r25, r26, r27, r28, r29, r30, r31, r32, r33, r34, r35, r36, r37, r38, r39;
  r3 = 0;
  r4 = r1;
  while (1) {
    if ((_isspace(HEAP8[r4] | 0) | 0) == 0) {
      break;
    } else {
      r4 = r4 + 1 | 0;
    }
  }
  r5 = HEAP8[r4];
  if (r5 << 24 >> 24 == 43) {
    r6 = r4 + 1 | 0;
    r7 = 0;
  } else if (r5 << 24 >> 24 == 45) {
    r6 = r4 + 1 | 0;
    r7 = 1;
  } else {
    r6 = r4;
    r7 = 0;
  }
  r4 = -1;
  r5 = 0;
  r8 = r6;
  while (1) {
    r6 = HEAP8[r8];
    if (((r6 << 24 >> 24) - 48 | 0) >>> 0 < 10) {
      r9 = r4;
    } else {
      if (r6 << 24 >> 24 != 46 | (r4 | 0) > -1) {
        break;
      } else {
        r9 = r5;
      }
    }
    r4 = r9;
    r5 = r5 + 1 | 0;
    r8 = r8 + 1 | 0;
  }
  r9 = r8 + -r5 | 0;
  r6 = (r4 | 0) < 0;
  r10 = ((r6 ^ 1) << 31 >> 31) + r5 | 0;
  r11 = (r10 | 0) > 18;
  r12 = (r11 ? -18 : -r10 | 0) + (r6 ? r5 : r4) | 0;
  r4 = r11 ? 18 : r10;
  do {
    if ((r4 | 0) == 0) {
      r13 = r1;
      r14 = 0;
    } else {
      do {
        if ((r4 | 0) > 9) {
          r10 = r9;
          r11 = r4;
          r5 = 0;
          while (1) {
            r6 = HEAP8[r10];
            r15 = r10 + 1 | 0;
            if (r6 << 24 >> 24 == 46) {
              r16 = HEAP8[r15];
              r17 = r10 + 2 | 0;
            } else {
              r16 = r6;
              r17 = r15;
            }
            r18 = (r16 << 24 >> 24) + ((r5 * 10 & -1) - 48) | 0;
            r15 = r11 - 1 | 0;
            if ((r15 | 0) > 9) {
              r10 = r17;
              r11 = r15;
              r5 = r18;
            } else {
              break;
            }
          }
          r19 = (r18 | 0) * 1e9;
          r20 = 9;
          r21 = r17;
          r3 = 2678;
          break;
        } else {
          if ((r4 | 0) > 0) {
            r19 = 0;
            r20 = r4;
            r21 = r9;
            r3 = 2678;
            break;
          } else {
            r22 = 0;
            r23 = 0;
            break;
          }
        }
      } while (0);
      if (r3 == 2678) {
        r5 = r21;
        r11 = r20;
        r10 = 0;
        while (1) {
          r15 = HEAP8[r5];
          r6 = r5 + 1 | 0;
          if (r15 << 24 >> 24 == 46) {
            r24 = HEAP8[r6];
            r25 = r5 + 2 | 0;
          } else {
            r24 = r15;
            r25 = r6;
          }
          r26 = (r24 << 24 >> 24) + ((r10 * 10 & -1) - 48) | 0;
          r6 = r11 - 1 | 0;
          if ((r6 | 0) > 0) {
            r5 = r25;
            r11 = r6;
            r10 = r26;
          } else {
            break;
          }
        }
        r22 = r26 | 0;
        r23 = r19;
      }
      r10 = r23 + r22;
      r11 = HEAP8[r8];
      L3490 : do {
        if (r11 << 24 >> 24 == 69 | r11 << 24 >> 24 == 101) {
          r5 = r8 + 1 | 0;
          r6 = HEAP8[r5];
          if (r6 << 24 >> 24 == 45) {
            r27 = r8 + 2 | 0;
            r28 = 1;
          } else if (r6 << 24 >> 24 == 43) {
            r27 = r8 + 2 | 0;
            r28 = 0;
          } else {
            r27 = r5;
            r28 = 0;
          }
          if (((HEAP8[r27] | 0) - 48 | 0) >>> 0 < 10) {
            r29 = r27;
            r30 = 0;
          } else {
            r31 = 0;
            r32 = r27;
            r33 = r28;
            break;
          }
          while (1) {
            r5 = (r30 * 10 & -1) - 48 + (HEAP8[r29] | 0) | 0;
            r6 = r29 + 1 | 0;
            if (((HEAP8[r6] | 0) - 48 | 0) >>> 0 < 10) {
              r29 = r6;
              r30 = r5;
            } else {
              r31 = r5;
              r32 = r6;
              r33 = r28;
              break L3490;
            }
          }
        } else {
          r31 = 0;
          r32 = r8;
          r33 = 0;
        }
      } while (0);
      r11 = r12 + ((r33 | 0) == 0 ? r31 : -r31 | 0) | 0;
      r6 = (r11 | 0) < 0 ? -r11 | 0 : r11;
      do {
        if ((r6 | 0) > 511) {
          r5 = ___errno_location();
          HEAP32[r5 >> 2] = 34;
          r34 = 1;
          r35 = 409676;
          r36 = 511;
          r3 = 2695;
          break;
        } else {
          if ((r6 | 0) == 0) {
            r37 = 1;
            break;
          } else {
            r34 = 1;
            r35 = 409676;
            r36 = r6;
            r3 = 2695;
            break;
          }
        }
      } while (0);
      L3502 : do {
        if (r3 == 2695) {
          while (1) {
            r3 = 0;
            if ((r36 & 1 | 0) == 0) {
              r38 = r34;
            } else {
              r38 = r34 * (HEAP32[tempDoublePtr >> 2] = HEAP32[r35 >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[r35 + 4 >> 2], HEAPF64[tempDoublePtr >> 3]);
            }
            r6 = r36 >> 1;
            if ((r6 | 0) == 0) {
              r37 = r38;
              break L3502;
            } else {
              r34 = r38;
              r35 = r35 + 8 | 0;
              r36 = r6;
              r3 = 2695;
            }
          }
        }
      } while (0);
      if ((r11 | 0) > -1) {
        r13 = r32;
        r14 = r10 * r37;
        break;
      } else {
        r13 = r32;
        r14 = r10 / r37;
        break;
      }
    }
  } while (0);
  if ((r2 | 0) != 0) {
    HEAP32[r2 >> 2] = r13;
  }
  if ((r7 | 0) == 0) {
    r39 = r14;
    return r39;
  }
  r39 = -r14;
  return r39;
}
function _strtold(r1, r2) {
  return _strtod(r1, r2);
}
function _strtof(r1, r2) {
  return _strtod(r1, r2);
}
function _strtod_l(r1, r2, r3) {
  return _strtod(r1, r2);
}
function _strtold_l(r1, r2, r3) {
  return _strtold(r1, r2);
}
function _atof(r1) {
  return _strtod(r1, 0);
}
function __err(r1, r2, r3) {
  var r4, r5;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r5 = r4;
  HEAP32[r5 >> 2] = r3;
  __verr(r1, r2, HEAP32[r5 >> 2]);
}
function __errx(r1, r2, r3) {
  var r4, r5;
  r4 = STACKTOP;
  STACKTOP = STACKTOP + 4 | 0;
  r5 = r4;
  HEAP32[r5 >> 2] = r3;
  __verrx(r1, r2, HEAP32[r5 >> 2]);
}
function __verr(r1, r2, r3) {
  var r4, r5;
  r4 = ___errno_location();
  r5 = HEAP32[r4 >> 2];
  r4 = HEAP32[___progname >> 2];
  _fprintf(HEAP32[_stderr >> 2], 411112, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r4, tempInt));
  if ((r2 | 0) != 0) {
    _fprintf(HEAP32[_stderr >> 2], r2, r3);
    _fwrite(411344, 2, 1, HEAP32[_stderr >> 2]);
  }
  r3 = HEAP32[_stderr >> 2];
  r2 = _strerror(r5);
  _fprintf(r3, 411220, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r2, tempInt));
  _exit(r1);
}
function __verrx(r1, r2, r3) {
  var r4;
  r4 = HEAP32[___progname >> 2];
  _fprintf(HEAP32[_stderr >> 2], 411272, (tempInt = STACKTOP, STACKTOP = STACKTOP + 4 | 0, HEAP32[tempInt >> 2] = r4, tempInt));
  if ((r2 | 0) != 0) {
    _fprintf(HEAP32[_stderr >> 2], r2, r3);
  }
  _fputc(10, HEAP32[_stderr >> 2]);
  _exit(r1);
}
// EMSCRIPTEN_END_FUNCS
Module["_jsapi_event_get_type"] = _jsapi_event_get_type;
Module["_jsapi_event_get_peer"] = _jsapi_event_get_peer;
Module["_jsapi_event_get_channelID"] = _jsapi_event_get_channelID;
Module["_jsapi_event_get_packet"] = _jsapi_event_get_packet;
Module["_jsapi_event_get_data"] = _jsapi_event_get_data;
Module["_jsapi_address_get_host"] = _jsapi_address_get_host;
Module["_jsapi_address_get_port"] = _jsapi_address_get_port;
Module["_jsapi_packet_get_data"] = _jsapi_packet_get_data;
Module["_jsapi_packet_get_dataLength"] = _jsapi_packet_get_dataLength;
Module["_jsapi_packet_set_free_callback"] = _jsapi_packet_set_free_callback;
Module["_jsapi_host_get_receivedAddress"] = _jsapi_host_get_receivedAddress;
Module["_jsapi_host_get_socket"] = _jsapi_host_get_socket;
Module["_jsapi_peer_get_address"] = _jsapi_peer_get_address;
Module["_jsapi_enet_host_create"] = _jsapi_enet_host_create;
Module["_jsapi_enet_host_create_client"] = _jsapi_enet_host_create_client;
Module["_jsapi_enet_host_connect"] = _jsapi_enet_host_connect;
Module["_jsapi_event_new"] = _jsapi_event_new;
Module["_jsapi_event_free"] = _jsapi_event_free;
Module["_enet_host_destroy"] = _enet_host_destroy;
Module["_enet_packet_create"] = _enet_packet_create;
Module["_enet_packet_destroy"] = _enet_packet_destroy;
Module["_enet_peer_send"] = _enet_peer_send;
Module["_enet_peer_reset"] = _enet_peer_reset;
Module["_enet_peer_ping"] = _enet_peer_ping;
Module["_enet_peer_disconnect_now"] = _enet_peer_disconnect_now;
Module["_enet_peer_disconnect"] = _enet_peer_disconnect;
Module["_enet_peer_disconnect_later"] = _enet_peer_disconnect_later;
Module["_enet_host_flush"] = _enet_host_flush;
Module["_enet_host_service"] = _enet_host_service;
Module["_calloc"] = _calloc;
Module["_realloc"] = _realloc;
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(!Module['preRun'] || Module['preRun'].length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_STATIC) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_STATIC));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_STATIC);
  var ret;
  var initialStackTop = STACKTOP;
  try {
    ret = Module['_main'](argc, argv, 0);
  }
  catch(e) {
    if (e.name == 'ExitStatus') {
      return e.status;
    } else if (e == 'SimulateInfiniteLoop') {
      Module['noExitRuntime'] = true;
    } else {
      throw e;
    }
  } finally {
    STACKTOP = initialStackTop;
  }
  return ret;
}
function run(args) {
  args = args || Module['arguments'];
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return 0;
  }
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    var toRun = Module['preRun'];
    Module['preRun'] = [];
    for (var i = toRun.length-1; i >= 0; i--) {
      toRun[i]();
    }
    if (runDependencies > 0) {
      // a preRun added a dependency, run will be called later
      return 0;
    }
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    var ret = 0;
    calledRun = true;
    if (Module['_main'] && shouldRunNow) {
      ret = Module.callMain(args);
      if (!Module['noExitRuntime']) {
        exitRuntime();
      }
    }
    if (Module['postRun']) {
      if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
      while (Module['postRun'].length > 0) {
        Module['postRun'].pop()();
      }
    }
    return ret;
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
    return 0;
  } else {
    return doRun();
  }
}
Module['run'] = Module.run = run;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
run();
// {{POST_RUN_ADDITIONS}}
  // {{MODULE_ADDITIONS}}
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
   var socket = udp_sockets[socketfd];
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
//turn a channel with peer into a node writeable Stream
// ref: https://github.com/substack/stream-handbook
ENetHost.prototype.createWriteStream = function(peer,channel){
    var s = new Stream();
    var totalPacketSizes = 0;
    s.readable = false;
    s.writeable = true;
    var host = this;
    peer.on("disconnect",function(data){
            if(s.writeable) s.destroy();
            s.emit("end");
    });
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
        if(arguments.length) s.write(buf);
        s.destroy();
    };
    s.destroy = function(){
        s.writeable = false;
    };
    return s;
};
ENetHost.prototype.createReadStream = function(peer,channel){
    var s = new Stream();
    s.readable = true;
    s.writeable = false;
    var paused = false;
    var host = this;
    peer.on("disconnect",function(data){
            s.readable = false;
            s.emit("end");
    });
    peer.on("message",function(_packet,_channel){
        if(channel === _channel ){
            if(!paused) s.emit("data",_packet.data());
                //else ... queue incoming packets
        }
    });
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
