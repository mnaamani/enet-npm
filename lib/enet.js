var moduleScope = {};
(function(){
var Module = {};
Module["preRun"]=[];
Module["preRun"].push(function(){
        Module["jsapi"]={};
        Module["jsapi"]["init"]=cwrap('jsapi_init','',['number']);
        Module["jsapi"]["enet_host_create_client"] = cwrap('jsapi_enet_host_create_client', 'number',
            ['number','number','number','number']);
        Module["jsapi"]["enet_host_create"] = cwrap('jsapi_enet_host_create', 'number',
            ['number','number','number','number','number','number']);
        Module["jsapi"]["host_get_socket"] = cwrap('jsapi_host_get_socket',"number",['number']);
        Module["jsapi"]["host_get_receivedAddress"] = cwrap("jsapi_host_get_receivedAddress",'number',['number']);
        Module["jsapi"]["enet_host_connect"] = cwrap("jsapi_enet_host_connect","number",['number','number','number','number','number']);
        Module["jsapi"]["packet_get_data"] = cwrap("jsapi_packet_get_data","number",["number"]);
        Module["jsapi"]["packet_set_free_callback"] = cwrap("jsapi_packet_set_free_callback","",["number","number"]);
        Module["jsapi"]["packet_get_dataLength"] = cwrap("jsapi_packet_get_dataLength","number",["number"]);
        Module["jsapi"]["event_new"] = cwrap('jsapi_event_new','number');
        Module["jsapi"]["event_free"] = cwrap('jsapi_event_free','',['number']);
        Module["jsapi"]["event_get_type"] = cwrap('jsapi_event_get_type','number',['number']);
        Module["jsapi"]["event_get_peer"] =cwrap('jsapi_event_get_peer','number',['number']);
        Module["jsapi"]["event_get_packet"] = cwrap('jsapi_event_get_packet','number',['number']);
        Module["jsapi"]["event_get_data"] = cwrap('jsapi_event_get_data','number',['number']);
        Module["jsapi"]["event_get_channelID"] = cwrap('jsapi_event_get_channelID','number',['number']);
        Module["jsapi"]["address_get_host"] = cwrap('jsapi_address_get_host','number',['number']);
        Module["jsapi"]["address_get_port"] = cwrap('jsapi_address_get_port','number',['number']);
        Module["jsapi"]["peer_get_address"] = cwrap('jsapi_peer_get_address','number',['number']);
        Module["libenet"] = {};
        Module["libenet"]["host_service"] = cwrap("enet_host_service", 'number',['number','number','number']);
        Module["libenet"]["host_destroy"] = cwrap("enet_host_destroy",'',['number']);
        Module["libenet"]["host_flush"] = cwrap('enet_host_flush',"",['number']);	    
        Module["libenet"]["packet_create"] = cwrap("enet_packet_create","number",['number','number','number']);
        Module["libenet"]["packet_destroy"] =cwrap("enet_packet_destroy",'',['number']);
        Module["libenet"]["peer_send"] = cwrap('enet_peer_send','number',['number','number','number']);
        Module["libenet"]["peer_reset"] = cwrap('enet_peer_reset','',['number']);
        Module["libenet"]["peer_ping"] = cwrap('enet_peer_ping','',['number']);
        Module["libenet"]["peer_disconnect"] = cwrap('enet_peer_disconnect','',['number','number']);
        Module["libenet"]["peer_disconnect_now"] = cwrap('enet_peer_disconnect_now','',['number','number']);
        Module["libenet"]["peer_disconnect_later"] = cwrap('enet_peer_disconnect_later','',['number','number']);
        Module["GetSocket"]=function(fd){
            return(FS.streams[fd].socket);
        };
        Module["Runtime_addFunction"]=Runtime.addFunction;
        Module["Runtime_removeFunction"]=Runtime.removeFunction;
        Module["HEAPU8"]=HEAPU8;
        Module["HEAPU32"]=HEAPU32;
});
this["Module"]=Module;
// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
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
  Module['arguments'] = process['argv'].slice(2);
  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function() { throw 'no read() available (jsc?)' };
  }
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  this['Module'] = Module;
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  if (typeof console !== 'undefined') {
    Module['print'] = function(x) {
      console.log(x);
    };
    Module['printErr'] = function(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
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
Module['preRun'] = [];
Module['postRun'] = [];
// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
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
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
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
  if (isArrayType(type)) return true;
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
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
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
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (type == 'i64' || type == 'double' || vararg) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else if (field[0] === '<') {
        // vector type
        size = alignSize = Types.types[field].flatSize; // fully aligned
      } else if (field[0] === 'i') {
        // illegal integer field, that could not be legalized because it is an internal structure field
        // it is ok to have such fields, if we just use them as markers of field size and nothing more complex
        size = alignSize = parseInt(field.substr(1))/8;
        assert(size % 1 === 0, 'cannot handle non-byte-size field ' + field);
      } else {
        assert(false, 'invalid type for calculateStructAlignment');
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
    if (type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
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
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
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
      code = code & 0xFF;
      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }
      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
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
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
function jsCall() {
  var args = Array.prototype.slice.call(arguments);
  return Runtime.functionPointers[args[0]].apply(null, args.slice(1));
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
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
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
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
    var func = Module['_' + ident]; // closure exported function
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
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
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
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
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
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
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
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
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
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
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
  // TODO: use TextDecoder
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
// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0
}
Module['stringToUTF16'] = stringToUTF16;
// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0
}
Module['stringToUTF32'] = stringToUTF32;
function demangle(func) {
  try {
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++;
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] !== 'N') {
        // not namespaced
        if (func[i] === 'K') i++;
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      } else {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      }
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}
function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}
function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk
function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 409600;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 1048576;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
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
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited
var runtimeInitialized = false;
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
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
function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;
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
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;
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
if (!Math['imul']) Math['imul'] = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_toFloat32 = Math.toFloat32;
var Math_min = Math.min;
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
var memoryInitializer = null;
// === Body ===
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 2568;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });
var _stderr;
var _stderr=_stderr=allocate([0,0,0,0,0,0,0,0], "i8", ALLOC_STATIC);
var ___progname;
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTVN10__cxxabiv117__class_type_infoE;
var __ZNSt9bad_allocC1Ev;
var __ZNSt9bad_allocD1Ev;
var __ZNSt20bad_array_new_lengthC1Ev;
var __ZNSt20bad_array_new_lengthD1Ev;
var __ZNSt20bad_array_new_lengthD2Ev;
var _err;
var _errx;
var _warn;
var _warnx;
var _verr;
var _verrx;
var _vwarn;
var _vwarnx;
/* memory initializer */ allocate([111,112,116,105,111,110,32,114,101,113,117,105,114,101,115,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,115,0,0,0,0,0,0,0,111,112,116,105,111,110,32,114,101,113,117,105,114,101,115,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,99,0,0,0,0,0,0,0,0,0,0,0,0,0,36,64,0,0,0,0,0,0,89,64,0,0,0,0,0,136,195,64,0,0,0,0,132,215,151,65,0,128,224,55,121,195,65,67,23,110,5,181,181,184,147,70,245,249,63,233,3,79,56,77,50,29,48,249,72,119,130,90,60,191,115,127,221,79,21,117,32,8,0,0,0,0,0,0,63,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,255,255,255,255,0,0,0,0,255,255,255,255,0,0,0,0,111,112,116,105,111,110,32,100,111,101,115,110,39,116,32,116,97,107,101,32,97,110,32,97,114,103,117,109,101,110,116,32,45,45,32,37,46,42,115,0,0,0,0,0,0,0,0,0,117,110,107,110,111,119,110,32,111,112,116,105,111,110,32,45,45,32,37,115,0,0,0,0,117,110,107,110,111,119,110,32,111,112,116,105,111,110,32,45,45,32,37,99,0,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,8,0,0,0,48,0,0,0,44,0,0,0,8,0,0,0,4,0,0,0,6,0,0,0,8,0,0,0,24,0,0,0,8,0,0,0,12,0,0,0,16,0,0,0,24,0,0,0,0,0,0,0,66,0,0,0,0,0,0,0,70,0,0,0,0,0,0,0,70,0,0,0,0,0,0,0,97,109,98,105,103,117,111,117,115,32,111,112,116,105,111,110,32,45,45,32,37,46,42,115,0,0,0,0,0,0,0,0,37,115,58,32,0,0,0,0,80,79,83,73,88,76,89,95,67,79,82,82,69,67,84,0,109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,37,115,58,32,0,0,0,0,37,115,10,0,0,0,0,0,37,115,10,0,0,0,0,0,69,114,114,111,114,32,114,101,99,101,105,118,105,110,103,32,105,110,99,111,109,105,110,103,32,112,97,99,107,101,116,115,0,0,0,0,0,0,0,0,37,115,58,32,0,0,0,0,37,115,58,32,0,0,0,0,115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0,0,0,0,0,0,0,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0,0,0,0,58,32,0,0,0,0,0,0,58,32,0,0,0,0,0,0,69,114,114,111,114,32,115,101,110,100,105,110,103,32,111,117,116,103,111,105,110,103,32,112,97,99,107,101,116,115,0,0,69,114,114,111,114,32,100,105,115,112,97,116,99,104,105,110,103,32,105,110,99,111,109,105,110,103,32,112,97,99,107,101,116,115,0,0,0,0,0,0,0,0,0,0,120,3,0,0,72,0,0,0,76,0,0,0,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,3,0,0,72,0,0,0,68,0,0,0,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,83,116,50,48,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0,0,0,0,0,0,0,0,0,0,0,0,48,3,0,0,0,0,0,0,64,3,0,0,112,3,0,0,0,0,0,0,0,0,0,0,80,3,0,0,120,3,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
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
  function _abort() {
      Module['abort']();
    }
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i32=_memset;
  var _llvm_memset_p0i8_i64=_memset;
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
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
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  var MEMFS={ops_table:null,CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            },
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            if (canOwn && buffer.buffer === HEAP8.buffer && offset === 0) {
              node.contents = buffer; // this is a subarray of the heap, and we can own it
              node.contentMode = MEMFS.CONTENT_OWNING;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },reconcile:function (src, dst, callback) {
        var total = 0;
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
        if (!total) {
          // early out
          return callback(null);
        }
        var completed = 0;
        var done = function(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
        var isRealDir = function(p) {
          return p !== '.' && p !== '..';
        };
        var toAbsolute = function(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
        while (check.length) {
          var path = check.pop();
          var stat, node;
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
        });
      }};
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.position = position;
          return position;
        }}};
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
        // start at the root
        var current = FS.root;
        var current_path = '/';
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            current = current.mount.root;
          }
          // follow symlinks
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.parent = null;
            this.mount = null;
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            FS.hashAddNode(this);
          };
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
          FS.FSNode.prototype = {};
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); },
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); },
            },
          });
        }
        return new FS.FSNode(parent, name, mode, rdev);
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 1;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = {};
          // compatibility
          Object.defineProperties(FS.FSStream, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        stream.prototype = FS.FSStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
        var completed = 0;
        var total = FS.mounts.length;
        var done = function(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path, { follow: false });
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.errnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
          this.stack = stackTrace();
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
        FS.mount(MEMFS, {}, '/');
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureErrnoError();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
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
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function() {
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
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
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
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};
  var NodeSockets={inet_aton_raw:function (str) {
          var b = str.split(".");
          return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
      },inet_ntoa_raw:function (addr) {
          return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
      },DGRAM:function (){
          if(typeof require !== 'undefined') return require("dgram");//node or browserified
          assert(false,"no dgram sockets backend found");
      },NET:function (){
          if(typeof require !== 'undefined') return require("net");//node or browserified
          assert(false);
      },buffer2uint8array:function (buffer){
        var arraybuffer = new ArrayBuffer(buffer.length);
        var uint8Array = new Uint8Array(arraybuffer);
        for(var i = 0; i < buffer.length; i++) {
          uint8Array[i] = buffer["readUInt8"](i);//cannot index Buffer with [] if browserified..
        }
        return uint8Array;
      }};function _send(fd, buf, len, flags) {
          var info = FS.streams[fd];
          if (!info || !info.socket) {
              ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
          }
          if(info.dgram && !info.bound) _bind(fd);
          info.sender(HEAPU8.subarray(buf, buf+len));
          return len;
      }
  function _pwrite(fildes, buf, nbyte, offset) {
      // ssize_t pwrite(int fildes, const void *buf, size_t nbyte, off_t offset);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte, offset);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }function _write(fildes, buf, nbyte) {
      // ssize_t write(int fildes, const void *buf, size_t nbyte);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/write.html
      var stream = FS.getStream(fildes);
      if (!stream) {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
      }
      try {
        var slab = HEAP8;
        return FS.write(stream, slab, buf, nbyte);
      } catch (e) {
        FS.handleFSError(e);
        return -1;
      }
    }
  Module["_strlen"] = _strlen;function _fputs(s, stream) {
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
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
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
  function _strerror_r(errnum, strerrbuf, buflen) {
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
      return ___errno_state;
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
      var now = Date.now();
      HEAP32[((ptr)>>2)]=Math.floor(now/1000); // seconds
      HEAP32[(((ptr)+(4))>>2)]=Math.floor((now-1000*Math.floor(now/1000))*1000); // microseconds
      return 0;
    }
  var DNS={address_map:{id:1,addrs:{},names:{}},lookup_name__deps:["_inet_pton4_raw","_inet_pton6_raw"],lookup_name:function (name) {
        // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
        var res = __inet_pton4_raw(name);
        if (res) {
          return name;
        }
        res = __inet_pton6_raw(name);
        if (res) {
          return name;
        }
        // See if this name is already mapped.
        var addr;
        if (DNS.address_map.addrs[name]) {
          addr = DNS.address_map.addrs[name];
        } else {
          var id = DNS.address_map.id++;
          assert(id < 65535, 'exceeded max address mappings of 65535');
          addr = '172.29.' + (id & 0xff) + '.' + (id & 0xff00);
          DNS.address_map.names[addr] = name;
          DNS.address_map.addrs[name] = addr;
        }
        return addr;
      },lookup_addr:function (addr) {
        if (DNS.address_map.names[addr]) {
          return DNS.address_map.names[addr];
        }
        return null;
      }};
  function __inet_pton4_raw(str) {
      var b = str.split('.');
      for (var i = 0; i < 4; i++) {
        var tmp = Number(b[i]);
        if (isNaN(tmp)) return null;
        b[i] = tmp;
      }
      return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
    }function _gethostbyname(name) {
      name = Pointer_stringify(name);
      // generate hostent
      var ret = _malloc(20); // XXX possibly leaked, as are others here
      var nameBuf = _malloc(name.length+1);
      writeStringToMemory(name, nameBuf);
      HEAP32[((ret)>>2)]=nameBuf
      var aliasesBuf = _malloc(4);
      HEAP32[((aliasesBuf)>>2)]=0
      HEAP32[(((ret)+(4))>>2)]=aliasesBuf
      var afinet = 2;
      HEAP32[(((ret)+(8))>>2)]=afinet
      HEAP32[(((ret)+(12))>>2)]=4
      var addrListBuf = _malloc(12);
      HEAP32[((addrListBuf)>>2)]=addrListBuf+8
      HEAP32[(((addrListBuf)+(4))>>2)]=0
      HEAP32[(((addrListBuf)+(8))>>2)]=__inet_pton4_raw(DNS.lookup_name(name))
      HEAP32[(((ret)+(16))>>2)]=addrListBuf
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
  function _inet_ntoa_raw(addr) {
          return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
     }function _inet_ntoa(in_addr) {
      if (!_inet_ntoa.buffer) {
        _inet_ntoa.buffer = _malloc(1024);
      }
      var addr = getValue(in_addr, 'i32');
      var str = _inet_ntoa_raw(addr);
      writeStringToMemory(str.substr(0, 1024), _inet_ntoa.buffer);
      return _inet_ntoa.buffer;
     }
  Module["_strncpy"] = _strncpy;
  function __inet_ntop4_raw(addr) {
      return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff)
    }function _gethostbyaddr(addr, addrlen, type) {
      if (type !== 2) {
        ___setErrNo(ERRNO_CODES.EAFNOSUPPORT);
        return null;
      }
      addr = HEAP32[((addr)>>2)]; // addr is in_addr
      var host = __inet_ntop4_raw(addr);
      var lookup = DNS.lookup_addr(host);
      if (lookup) {
        host = lookup;
      }
      var hostp = allocate(intArrayFromString(host), 'i8', ALLOC_STACK);
      return _gethostbyname(hostp);
    }
  function _inet_ntop6_raw(src){
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
     }function _connect(fd, addr, addrlen) {
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
              case 16:
                  info.addr = HEAP32[(((addr)+(4))>>2)];
                  info.port = _htons( HEAP16[(((addr)+(2))>>1)]);
                  info.host = NodeSockets.inet_ntoa_raw(info.addr);
                  break;
              case 28:
                  info.port = _htons( HEAP16[(((addr)+(2))>>1)] );
                  info.host = _inet_ntop6_raw(addr + 8 );
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
      }function _bind(fd, addr, addrlen) {
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
                  case 16:
                      info.local_addr = HEAP32[(((addr)+(4))>>2)];
                      info.local_port = _htons( HEAP16[(((addr)+(2))>>1)] );
                      info.local_host = NodeSockets.inet_ntoa_raw(info.local_addr);
                      break;
                  case 28:
                      info.local_port = _htons( HEAP16[(((addr)+(2))>>1)] );
                      info.local_host = _inet_ntop6_raw(addr + 8 );
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
                 info.socket["bind"](info.local_port||0,info.local_host||undefined);
                 info.socket["on"]('message',function(msg,rinfo){
                      if(info.host && info.connected){
                          //connected dgram socket will only accept packets from info.host:info.port
                          if(info.host !== rinfo.address || info.port !== rinfo.port) return;
                      }
                      var buf = msg instanceof ArrayBuffer ? new Uint8Array(msg) : NodeSockets.buffer2uint8array(msg);
                      buf.from= {
                          host: rinfo["address"],
                          port: rinfo["port"]
                      }
                      info.inQueue.push(buf);
                 });
                 info.sender = function(buf,ip,port){
                      var buffer = new Buffer(buf);
                      info.socket["send"](buffer,0,buffer.length,port,ip);
                 }
            }
          }catch(e){
              return -1;
          }
          return 0;
      }
  var SOCKFS={mount:function (mount) {
        return FS.createNode(null, '/', 16384 | 0777, 0);
      },createSocket:function (family, type, protocol) {
        var streaming = type == 1;
        if (protocol) {
          assert(streaming == (protocol == 6)); // if SOCK_STREAM, must be tcp
        }
        // create our internal socket structure
        var sock = {
          family: family,
          type: type,
          protocol: protocol,
          server: null,
          peers: {},
          pending: [],
          recv_queue: [],
          sock_ops: SOCKFS.websocket_sock_ops
        };
        // create the filesystem node to store the socket structure
        var name = SOCKFS.nextname();
        var node = FS.createNode(SOCKFS.root, name, 49152, 0);
        node.sock = sock;
        // and the wrapping stream that enables library functions such
        // as read and write to indirectly interact with the socket
        var stream = FS.createStream({
          path: name,
          node: node,
          flags: FS.modeStringToFlags('r+'),
          seekable: false,
          stream_ops: SOCKFS.stream_ops
        });
        // map the new stream to the socket structure (sockets have a 1:1
        // relationship with a stream)
        sock.stream = stream;
        return sock;
      },getSocket:function (fd) {
        var stream = FS.getStream(fd);
        if (!stream || !FS.isSocket(stream.node.mode)) {
          return null;
        }
        return stream.node.sock;
      },stream_ops:{poll:function (stream) {
          var sock = stream.node.sock;
          return sock.sock_ops.poll(sock);
        },ioctl:function (stream, request, varargs) {
          var sock = stream.node.sock;
          return sock.sock_ops.ioctl(sock, request, varargs);
        },read:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          var msg = sock.sock_ops.recvmsg(sock, length);
          if (!msg) {
            // socket is closed
            return 0;
          }
          buffer.set(msg.buffer, offset);
          return msg.buffer.length;
        },write:function (stream, buffer, offset, length, position /* ignored */) {
          var sock = stream.node.sock;
          return sock.sock_ops.sendmsg(sock, buffer, offset, length);
        },close:function (stream) {
          var sock = stream.node.sock;
          sock.sock_ops.close(sock);
        }},nextname:function () {
        if (!SOCKFS.nextname.current) {
          SOCKFS.nextname.current = 0;
        }
        return 'socket[' + (SOCKFS.nextname.current++) + ']';
      },websocket_sock_ops:{createPeer:function (sock, addr, port) {
          var ws;
          if (typeof addr === 'object') {
            ws = addr;
            addr = null;
            port = null;
          }
          if (ws) {
            // for sockets that've already connected (e.g. we're the server)
            // we can inspect the _socket property for the address
            if (ws._socket) {
              addr = ws._socket.remoteAddress;
              port = ws._socket.remotePort;
            }
            // if we're just now initializing a connection to the remote,
            // inspect the url property
            else {
              var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
              if (!result) {
                throw new Error('WebSocket URL must be in the format ws(s)://address:port');
              }
              addr = result[1];
              port = parseInt(result[2], 10);
            }
          } else {
            // create the actual websocket object and connect
            try {
              var url = 'ws://' + addr + ':' + port;
              // the node ws library API is slightly different than the browser's
              var opts = ENVIRONMENT_IS_NODE ? {} : ['binary'];
              ws = new WebSocket(url, opts);
              ws.binaryType = 'arraybuffer';
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH);
            }
          }
          var peer = {
            addr: addr,
            port: port,
            socket: ws,
            dgram_send_queue: []
          };
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
          // if this is a bound dgram socket, send the port number first to allow
          // us to override the ephemeral port reported to us by remotePort on the
          // remote end.
          if (sock.type === 2 && typeof sock.sport !== 'undefined') {
            peer.dgram_send_queue.push(new Uint8Array([
                255, 255, 255, 255,
                'p'.charCodeAt(0), 'o'.charCodeAt(0), 'r'.charCodeAt(0), 't'.charCodeAt(0),
                ((sock.sport & 0xff00) >> 8) , (sock.sport & 0xff)
            ]));
          }
          return peer;
        },getPeer:function (sock, addr, port) {
          return sock.peers[addr + ':' + port];
        },addPeer:function (sock, peer) {
          sock.peers[peer.addr + ':' + peer.port] = peer;
        },removePeer:function (sock, peer) {
          delete sock.peers[peer.addr + ':' + peer.port];
        },handlePeerEvents:function (sock, peer) {
          var first = true;
          var handleOpen = function () {
            try {
              var queued = peer.dgram_send_queue.shift();
              while (queued) {
                peer.socket.send(queued);
                queued = peer.dgram_send_queue.shift();
              }
            } catch (e) {
              // not much we can do here in the way of proper error handling as we've already
              // lied and said this data was sent. shut it down.
              peer.socket.close();
            }
          };
          var handleMessage = function(data) {
            assert(typeof data !== 'string' && data.byteLength !== undefined);  // must receive an ArrayBuffer
            data = new Uint8Array(data);  // make a typed array view on the array buffer
            // if this is the port message, override the peer's port with it
            var wasfirst = first;
            first = false;
            if (wasfirst &&
                data.length === 10 &&
                data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 &&
                data[4] === 'p'.charCodeAt(0) && data[5] === 'o'.charCodeAt(0) && data[6] === 'r'.charCodeAt(0) && data[7] === 't'.charCodeAt(0)) {
              // update the peer's port and it's key in the peer map
              var newport = ((data[8] << 8) | data[9]);
              SOCKFS.websocket_sock_ops.removePeer(sock, peer);
              peer.port = newport;
              SOCKFS.websocket_sock_ops.addPeer(sock, peer);
              return;
            }
            sock.recv_queue.push({ addr: peer.addr, port: peer.port, data: data });
          };
          if (ENVIRONMENT_IS_NODE) {
            peer.socket.on('open', handleOpen);
            peer.socket.on('message', function(data, flags) {
              if (!flags.binary) {
                return;
              }
              handleMessage((new Uint8Array(data)).buffer);  // copy from node Buffer -> ArrayBuffer
            });
            peer.socket.on('error', function() {
              // don't throw
            });
          } else {
            peer.socket.onopen = handleOpen;
            peer.socket.onmessage = function(event) {
              handleMessage(event.data);
            };
          }
        },poll:function (sock) {
          if (sock.type === 1 && sock.server) {
            // listen sockets should only say they're available for reading
            // if there are pending clients.
            return sock.pending.length ? (64 | 1) : 0;
          }
          var mask = 0;
          var dest = sock.type === 1 ?  // we only care about the socket state for connection-based sockets
            SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) :
            null;
          if (sock.recv_queue.length ||
              !dest ||  // connection-less sockets are always ready to read
              (dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {  // let recv return 0 once closed
            mask |= (64 | 1);
          }
          if (!dest ||  // connection-less sockets are always ready to write
              (dest && dest.socket.readyState === dest.socket.OPEN)) {
            mask |= 4;
          }
          if ((dest && dest.socket.readyState === dest.socket.CLOSING) ||
              (dest && dest.socket.readyState === dest.socket.CLOSED)) {
            mask |= 16;
          }
          return mask;
        },ioctl:function (sock, request, arg) {
          switch (request) {
            case 21531:
              var bytes = 0;
              if (sock.recv_queue.length) {
                bytes = sock.recv_queue[0].data.length;
              }
              HEAP32[((arg)>>2)]=bytes;
              return 0;
            default:
              return ERRNO_CODES.EINVAL;
          }
        },close:function (sock) {
          // if we've spawned a listen server, close it
          if (sock.server) {
            try {
              sock.server.close();
            } catch (e) {
            }
            sock.server = null;
          }
          // close any peer connections
          var peers = Object.keys(sock.peers);
          for (var i = 0; i < peers.length; i++) {
            var peer = sock.peers[peers[i]];
            try {
              peer.socket.close();
            } catch (e) {
            }
            SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          }
          return 0;
        },bind:function (sock, addr, port) {
          if (typeof sock.saddr !== 'undefined' || typeof sock.sport !== 'undefined') {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already bound
          }
          sock.saddr = addr;
          sock.sport = port || _mkport();
          // in order to emulate dgram sockets, we need to launch a listen server when
          // binding on a connection-less socket
          // note: this is only required on the server side
          if (sock.type === 2) {
            // close the existing server if it exists
            if (sock.server) {
              sock.server.close();
              sock.server = null;
            }
            // swallow error operation not supported error that occurs when binding in the
            // browser where this isn't supported
            try {
              sock.sock_ops.listen(sock, 0);
            } catch (e) {
              if (!(e instanceof FS.ErrnoError)) throw e;
              if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e;
            }
          }
        },connect:function (sock, addr, port) {
          if (sock.server) {
            throw new FS.ErrnoError(ERRNO_CODS.EOPNOTSUPP);
          }
          // TODO autobind
          // if (!sock.addr && sock.type == 2) {
          // }
          // early out if we're already connected / in the middle of connecting
          if (typeof sock.daddr !== 'undefined' && typeof sock.dport !== 'undefined') {
            var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
            if (dest) {
              if (dest.socket.readyState === dest.socket.CONNECTING) {
                throw new FS.ErrnoError(ERRNO_CODES.EALREADY);
              } else {
                throw new FS.ErrnoError(ERRNO_CODES.EISCONN);
              }
            }
          }
          // add the socket to our peer list and set our
          // destination address / port to match
          var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          sock.daddr = peer.addr;
          sock.dport = peer.port;
          // always "fail" in non-blocking mode
          throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS);
        },listen:function (sock, backlog) {
          if (!ENVIRONMENT_IS_NODE) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
          }
          if (sock.server) {
             throw new FS.ErrnoError(ERRNO_CODES.EINVAL);  // already listening
          }
          var WebSocketServer = require('ws').Server;
          var host = sock.saddr;
          sock.server = new WebSocketServer({
            host: host,
            port: sock.sport
            // TODO support backlog
          });
          sock.server.on('connection', function(ws) {
            if (sock.type === 1) {
              var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
              // create a peer on the new socket
              var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
              newsock.daddr = peer.addr;
              newsock.dport = peer.port;
              // push to queue for accept to pick up
              sock.pending.push(newsock);
            } else {
              // create a peer on the listen socket so calling sendto
              // with the listen socket and an address will resolve
              // to the correct client
              SOCKFS.websocket_sock_ops.createPeer(sock, ws);
            }
          });
          sock.server.on('closed', function() {
            sock.server = null;
          });
          sock.server.on('error', function() {
            // don't throw
          });
        },accept:function (listensock) {
          if (!listensock.server) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          var newsock = listensock.pending.shift();
          newsock.stream.flags = listensock.stream.flags;
          return newsock;
        },getname:function (sock, peer) {
          var addr, port;
          if (peer) {
            if (sock.daddr === undefined || sock.dport === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            }
            addr = sock.daddr;
            port = sock.dport;
          } else {
            // TODO saddr and sport will be set for bind()'d UDP sockets, but what
            // should we be returning for TCP sockets that've been connect()'d?
            addr = sock.saddr || 0;
            port = sock.sport || 0;
          }
          return { addr: addr, port: port };
        },sendmsg:function (sock, buffer, offset, length, addr, port) {
          if (sock.type === 2) {
            // connection-less sockets will honor the message address,
            // and otherwise fall back to the bound destination address
            if (addr === undefined || port === undefined) {
              addr = sock.daddr;
              port = sock.dport;
            }
            // if there was no address to fall back to, error out
            if (addr === undefined || port === undefined) {
              throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ);
            }
          } else {
            // connection-based sockets will only use the bound
            addr = sock.daddr;
            port = sock.dport;
          }
          // find the peer for the destination address
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
          // early out if not connected with a connection-based socket
          if (sock.type === 1) {
            if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
            } else if (dest.socket.readyState === dest.socket.CONNECTING) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // create a copy of the incoming data to send, as the WebSocket API
          // doesn't work entirely with an ArrayBufferView, it'll just send
          // the entire underlying buffer
          var data;
          if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
            data = buffer.slice(offset, offset + length);
          } else {  // ArrayBufferView
            data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length);
          }
          // if we're emulating a connection-less dgram socket and don't have
          // a cached connection, queue the buffer to send upon connect and
          // lie, saying the data was sent now.
          if (sock.type === 2) {
            if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
              // if we're not connected, open a new connection
              if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
              }
              dest.dgram_send_queue.push(data);
              return length;
            }
          }
          try {
            // send the actual data
            dest.socket.send(data);
            return length;
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
        },recvmsg:function (sock, length) {
          // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
          if (sock.type === 1 && sock.server) {
            // tcp servers should not be recv()'ing on the listen socket
            throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
          }
          var queued = sock.recv_queue.shift();
          if (!queued) {
            if (sock.type === 1) {
              var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
              if (!dest) {
                // if we have a destination address but are not connected, error out
                throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN);
              }
              else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
                // return null if the socket has closed
                return null;
              }
              else {
                // else, our socket is in a valid state but truly has nothing available
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
            } else {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
          }
          // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
          // requeued TCP data it'll be an ArrayBufferView
          var queuedLength = queued.data.byteLength || queued.data.length;
          var queuedOffset = queued.data.byteOffset || 0;
          var queuedBuffer = queued.data.buffer || queued.data;
          var bytesRead = Math.min(length, queuedLength);
          var res = {
            buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
            addr: queued.addr,
            port: queued.port
          };
          // push back any unread data for TCP connections
          if (sock.type === 1 && bytesRead < queuedLength) {
            var bytesRemaining = queuedLength - bytesRead;
            queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
            sock.recv_queue.unshift(queued);
          }
          return res;
        }}};function _listen(fd, backlog) {
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
          });
          info.socket["on"]("connection",function(socket){
               info.connQueue.push(socket);
          });
          return 0;
      }
  function _socket(family, type, protocol) {
          var fd;
          if(!(family == 2 || family == 10))
          {
              ___setErrNo(ERRNO_CODES.EAFNOSUPPORT);
              return -1;
          }
          var v6 = (family == 10)
          var stream = type === 1;
          var dgram = type === 2;
          if (protocol) {
            assert(stream == (protocol == 6)); // if stream, must be tcp
            assert(dgram  == (protocol == 17)); // if dgram, must be udp
          }
          try{
           if(stream){
            fd = FS.createStream({
              addrlen : v6 ? 28 : 16 ,
              connected: false,
              stream: true,
              socket: true, //real socket will be created when bind() or connect() is called 
                            //to choose between server and connection sockets
              inQueue: []
            }).fd;
           }else if(dgram){
            fd = FS.createStream({
              addrlen : v6 ? 28 : 16 ,
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
           return fd;
          }catch(e){
              ___setErrNo(ERRNO_CODES.EACCES);
              return -1;
          }
      }
  function _setsockopt(d, level, optname, optval, optlen) {
          //console.log('ignoring setsockopt command');
          return 0;
      }
  function _inet_pton6_raw(addr,dst){
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
     }function _accept(fd, addr, addrlen) {
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
                  case 16:
                      setValue(addr + 4, NodeSockets.inet_aton_raw(conn.host), 'i32');
                      setValue(addr + 2, conn.port, 'i16');
                      setValue(addr + 0, 2, 'i16');
                      setValue(addrlen, 16, 'i32');
                      break;
                  case 28:
                      _inet_pton6_raw(conn.host,addr + 8);
                      setValue(addr + 2, conn.port, 'i16');
                      setValue(addr + 0, 10, 'i16');
                      setValue(addrlen, 28, 'i32');
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
      }
  function _shutdown(fd, how) {
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
      }
  function _close(fildes) {
       // int close(int fildes);
       // http://pubs.opengroup.org/onlinepubs/000095399/functions/close.html
       var stream = FS.getStream(fildes);
       if(stream) {
         if(stream.socket){
           if(stream.interval) clearInterval(stream.interval);
           if(typeof stream.socket["close"] == "function") stream.socket["close"]();//udp sockets, tcp listening sockets
           if(typeof stream.socket["end"] == "function") stream.socket["end"]();//tcp connections
           FS.closeStream(stream.fd);
           return 0;
         } else {
          try {
            if (stream.stream_ops.close) {
              stream.stream_ops.close(stream);
            }
          } catch (e) {
            throw e;
          } finally {
            FS.closeStream(stream.fd);
          }
          return 0;
         }
       } else {
        ___setErrNo(ERRNO_CODES.EBADF);
        return -1;
       }
      }
  function _sendmsg(fd, msg, flags) {
          var info = FS.streams[fd];
          if (!info || !info.socket) {
              ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
          }
          // if we are not connected, use the address info in the message
          var name = HEAP32[((msg)>>2)];
          var namelen = HEAP32[(((msg)+(4))>>2)];
          if (!info.connected) {
            assert(name, 'sendmsg on non-connected socket, and no name/address in the message');
            if(info.stream) _connect(fd, name, namelen);
          }
          var iov = HEAP32[(((msg)+(8))>>2)];
          var num = HEAP32[(((msg)+(12))>>2)];
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
          assert( info.addrlen === namelen );
          var addr,port,host;
          switch(namelen){
              case 16:
                  addr = getValue(name + 4, 'i32');
                  port = _htons(getValue(name + 2, 'i16'));
                  host = NodeSockets.inet_ntoa_raw(addr);
                  break;
              case 28:
                  port = _htons( HEAP16[(((name)+(2))>>1)]);
                  host = _inet_ntop6_raw(name + 8);
                  break;
          }
          if(info.dgram && !info.bound) _bind(fd);
          info.sender(buffer,host,port); // send all the iovs as a single message
          return ret;
      }
  function _recvfrom(fd, buf, len, flags, addr, addrlen) {
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
                  case 16:
                      HEAP32[(((addr)+(4))>>2)]=NodeSockets.inet_aton_raw(buffer.from.host);
                      HEAP16[(((addr)+(2))>>1)]=_htons(buffer.from.port);
                      break;
                  case 28:
                      _inet_pton6_raw(buffer.from.host,addr+ 8);
                      HEAP16[(((addr)+(2))>>1)]=_htons(buffer.from.port);
                      break;
              }
          }
          if (len < buffer.length) {
            if (info.stream) {
              // This is tcp (reliable), so if not all was read, keep it
              info.inQueue.unshift(buffer.subarray(len));
            }
            buffer = buffer.subarray(0, len);
          }
          HEAPU8.set(buffer, buf);
          return buffer.length;
      }function _recv(fd, buf, len, flags) {
          var info = FS.streams[fd];
          if (!info || !info.socket) {
              ___setErrNo(ERRNO_CODES.ENOTSOCK); return -1;
          }
          return _recvfrom(fd,buf,len,flags,0,0);
      }function _recvmsg(fd, msg, flags) {
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
          var name = HEAP32[((msg)>>2)];
          var namelen = HEAP32[(((msg)+(4))>>2)];
          assert( info.addrlen === namelen );
          // write source - assuming a dgram..
          switch(namelen){
              case 16:
                  if(info.connected){
                      HEAP32[(((name)+(4))>>2)]=info.addr;
                      HEAP16[(((name)+(2))>>1)]=_htons(info.port);
                  }else{
                      HEAP32[(((name)+(4))>>2)]=NodeSockets.inet_aton_raw(buffer.from.host);
                      HEAP16[(((name)+(2))>>1)]=_htons(buffer.from.port);
                  }
                  break;
              case 28:
                  if(info.connected){
                      _inet_pton6_raw(info.host,name + 8);
                      HEAP16[(((name)+(2))>>1)]=_htons(info.port);
                  }else{
                      _inet_pton6_raw(buffer.from.host,name + 8);
                      HEAP16[(((name)+(2))>>1)]=_htons(buffer.from.port);
                  }
                  break;
          }
          // write data
          var ret = bytes;
          var iov = HEAP32[(((msg)+(8))>>2)];
          var num = HEAP32[(((msg)+(12))>>2)];
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
  var ___DEFAULT_POLLMASK=5;function _select(nfds, readfds, writefds, exceptfds, timeout) {
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
            var srcLow  = HEAP32[((fds)>>2)];
            var srcHigh = HEAP32[(((fds)+(4))>>2)];
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
        var streamObj = FS.getStream(stream);
        if (streamObj) streamObj.error = true;
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
          ret = HEAPF64[(((varargs)+(argIndex))>>3)];
        } else if (type == 'i64') {
          ret = [HEAP32[(((varargs)+(argIndex))>>2)],
                 HEAP32[(((varargs)+(argIndex+8))>>2)]];
          argIndex += 8; // each 32-bit chunk is in a 64-bit block
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
          var flagPadSign = false;
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
              case 32:
                flagPadSign = true;
                break;
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
                prefix = (flagAlternative && currArg != 0) ? '0x' : '';
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
              if (currArg >= 0) {
                if (flagAlwaysSigned) {
                  prefix = '+' + prefix;
                } else if (flagPadSign) {
                  prefix = ' ' + prefix;
                }
              }
              // Move sign to prefix so we zero-pad after the sign
              if (argText.charAt(0) == '-') {
                prefix = '-' + prefix;
                argText = argText.substr(1);
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
                if (currArg >= 0) {
                  if (flagAlwaysSigned) {
                    argText = '+' + argText;
                  } else if (flagPadSign) {
                    argText = ' ' + argText;
                  }
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
              var arg = getNextArg('i8*');
              var argLength = arg ? _strlen(arg) : '(null)'.length;
              if (precisionSet) argLength = Math.min(argLength, precision);
              if (!flagLeftAlign) {
                while (argLength < width--) {
                  ret.push(32);
                }
              }
              if (arg) {
                for (var i = 0; i < argLength; i++) {
                  ret.push(HEAPU8[((arg++)|0)]);
                }
              } else {
                ret = ret.concat(intArrayFromString('(null)'.substr(0, argLength), true));
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
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }
  function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
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
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
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
      try {
        return _free(ptr);
      } catch(e) { // XXX FIXME
      }
    }function ___cxa_end_catch() {
      if (___cxa_end_catch.rethrown) {
        ___cxa_end_catch.rethrown = false;
        return;
      }
      // Clear state flag.
      asm['setThrew'](0);
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
  var _environ=allocate(1, "i32*", ALLOC_STATIC);var ___environ=_environ;function ___buildEnvironment(env) {
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
  function _vfprintf(s, f, va_arg) {
      return _fprintf(s, f, HEAP32[((va_arg)>>2)]);
    }
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module.print('exit(' + status + ') called');
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }
  function _isspace(chr) {
      return (chr == 32) || (chr >= 9 && chr <= 13);
    }
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
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
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
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
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
            Browser.safeSetTimeout(function() {
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
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
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
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
            ctx = canvas.getContext('experimental-webgl', contextAttributes);
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
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
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
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
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
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
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
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (window.scrollX + rect.left);
              y = t.pageY - (window.scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (window.scrollX + rect.left);
            y = event.pageY - (window.scrollY + rect.top);
          }
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
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
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
__ATINIT__.push({ func: function() { SOCKFS.root = FS.mount(SOCKFS, {}, null); } });
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
___buildEnvironment(ENV);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function() { Browser.getUserMedia() }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 409600;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var Math_min = Math.min;
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env._stderr|0;var n=env.__ZTVN10__cxxabiv120__si_class_type_infoE|0;var o=env.__ZTVN10__cxxabiv117__class_type_infoE|0;var p=env.___progname|0;var q=+env.NaN;var r=+env.Infinity;var s=0;var t=0;var u=0;var v=0;var w=0,x=0,y=0,z=0,A=0.0,B=0,C=0,D=0,E=0.0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=0;var O=0;var P=global.Math.floor;var Q=global.Math.abs;var R=global.Math.sqrt;var S=global.Math.pow;var T=global.Math.cos;var U=global.Math.sin;var V=global.Math.tan;var W=global.Math.acos;var X=global.Math.asin;var Y=global.Math.atan;var Z=global.Math.atan2;var _=global.Math.exp;var $=global.Math.log;var aa=global.Math.ceil;var ab=global.Math.imul;var ac=env.abort;var ad=env.assert;var ae=env.asmPrintInt;var af=env.asmPrintFloat;var ag=env.min;var ah=env.jsCall;var ai=env.invoke_ii;var aj=env.invoke_vi;var ak=env.invoke_vii;var al=env.invoke_iiiiiii;var am=env.invoke_iiiiii;var an=env.invoke_viii;var ao=env.invoke_v;var ap=env.invoke_iii;var aq=env._strncmp;var ar=env._llvm_va_end;var as=env._htonl;var at=env._sysconf;var au=env.__inet_pton4_raw;var av=env.___cxa_throw;var aw=env._inet_ntop6_raw;var ax=env._accept;var ay=env.___gxx_personality_v0;var az=env._abort;var aA=env._fprintf;var aB=env._connect;var aC=env._shutdown;var aD=env._close;var aE=env._inet_pton6_raw;var aF=env._fflush;var aG=env._htons;var aH=env._strchr;var aI=env._fputc;var aJ=env.___buildEnvironment;var aK=env._puts;var aL=env.___setErrNo;var aM=env._fwrite;var aN=env.___cxa_free_exception;var aO=env._inet_addr;var aP=env._send;var aQ=env._write;var aR=env._fputs;var aS=env._recvmsg;var aT=env._select;var aU=env.___cxa_find_matching_catch;var aV=env.__ZSt18uncaught_exceptionv;var aW=env._inet_aton;var aX=env._gethostbyaddr;var aY=env._listen;var aZ=env._exit;var a_=env._setsockopt;var a$=env.___cxa_is_number_type;var a0=env.__reallyNegative;var a1=env.___cxa_allocate_exception;var a2=env.__formatString;var a3=env.___cxa_does_inherit;var a4=env._getenv;var a5=env._gethostbyname;var a6=env._gettimeofday;var a7=env._vfprintf;var a8=env.___cxa_begin_catch;var a9=env._inet_ntoa_raw;var ba=env._inet_ntoa;var bb=env._llvm_eh_exception;var bc=env._recv;var bd=env.__inet_ntop4_raw;var be=env._pwrite;var bf=env._perror;var bg=env._socket;var bh=env._sbrk;var bi=env._strerror_r;var bj=env._bind;var bk=env.___errno_location;var bl=env._strerror;var bm=env._isspace;var bn=env._recvfrom;var bo=env.___cxa_call_unexpected;var bp=env._time;var bq=env.__exit;var br=env.___resumeException;var bs=env._sendmsg;var bt=env.___cxa_end_catch;
// EMSCRIPTEN_START_FUNCS
function bC(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function bD(){return i|0}function bE(a){a=a|0;i=a}function bF(a,b){a=a|0;b=b|0;if((s|0)==0){s=a;t=b}}function bG(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function bH(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function bI(a){a=a|0;F=a}function bJ(a){a=a|0;G=a}function bK(a){a=a|0;H=a}function bL(a){a=a|0;I=a}function bM(a){a=a|0;J=a}function bN(a){a=a|0;K=a}function bO(a){a=a|0;L=a}function bP(a){a=a|0;M=a}function bQ(a){a=a|0;N=a}function bR(a){a=a|0;O=a}function bS(){c[220]=o+8;c[222]=n+8;c[226]=n+8}function bT(a){a=a|0;var b=0,d=0;b=i;i=i+16|0;d=b|0;if((a|0)==0){dw()|0;i=b;return}else{c[d>>2]=0;c[d+4>>2]=0;c[d+8>>2]=0;c[d+12>>2]=a;cg(66309,d)|0;i=b;return}}function bU(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0;j=i;i=i+8|0;k=j|0;c[k>>2]=a;b[k+4>>1]=d&65535;d=cq(k,e,f,g,h)|0;i=j;return d|0}function bV(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0;f=cq(0,a,b,d,e)|0;c[f+10380>>2]=1;return f|0}function bW(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0;h=i;i=i+8|0;j=h|0;c[j>>2]=d;b[j+4>>1]=e&65535;e=cs(a,j,f,g)|0;i=h;return e|0}function bX(){return dP(20)|0}function bY(a){a=a|0;dQ(a);return}function bZ(a){a=a|0;return c[a>>2]|0}function b_(a){a=a|0;return c[a+4>>2]|0}function b$(a){a=a|0;return d[a+8|0]|0|0}function b0(a){a=a|0;return c[a+16>>2]|0}function b1(a){a=a|0;return c[a+12>>2]|0}function b2(a){a=a|0;return a|0}function b3(a){a=a|0;return e[a+4>>1]|0|0}function b4(a){a=a|0;return c[a+8>>2]|0}function b5(a){a=a|0;return c[a+12>>2]|0}function b6(a,b){a=a|0;b=b|0;c[a+16>>2]=b;return}function b7(a){a=a|0;return a+10348|0}function b8(a){a=a|0;return c[a+40>>2]|0}function b9(a){a=a|0;return c[a+44>>2]|0}function ca(a){a=a|0;return c[a+10356>>2]|0}function cb(a){a=a|0;return c[a+10360>>2]|0}function cc(a){a=a|0;return c[a>>2]|0}function cd(a){a=a|0;return a+24|0}function ce(a){a=a|0;return c[a+32>>2]|0}function cf(a){a=a|0;return c[a+44>>2]|0}function cg(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;if(a>>>0<66304){d=-1;return d|0}a=b|0;e=c[a>>2]|0;do{if((e|0)==0){if((c[b+4>>2]|0)==0){break}f=c[a>>2]|0;if((f|0)==0){d=-1}else{g=f;h=35;break}return d|0}else{g=e;h=35}}while(0);do{if((h|0)==35){e=b+4|0;if((c[e>>2]|0)==0){d=-1;return d|0}else{c[96]=g;c[94]=c[e>>2];break}}}while(0);g=c[b+8>>2]|0;if((g|0)!=0){c[92]=g}g=c[b+12>>2]|0;if((g|0)!=0){c[518]=g}d=dw()|0;return d|0}function ch(a){a=a|0;var b=0;b=bu[c[96]&127](a)|0;if((b|0)!=0){return b|0}bA[c[92]&127]();return b|0}function ci(a){a=a|0;bv[c[94]&127](a);return}function cj(a){a=a|0;var b=0,d=0;do{if((c[a+10360>>2]|0)==0){b=1}else{d=c[518]|0;if((d|0)==0){b=1;break}b=bu[d&127](a)|0}}while(0);return b|0}function ck(){return ch(65536)|0}function cl(a){a=a|0;if((a|0)==0){return}ci(a);return}function cm(f,g,h,j,k,l){f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aJ=0,aK=0,aL=0,aM=0,aN=0,aO=0,aP=0,aQ=0,aR=0,aS=0;m=i;i=i+8|0;n=m|0;o=k+l|0;b[n>>1]=0;if((f|0)==0|(h|0)==0|(j|0)==0){p=0;i=m;return p|0}j=c[g>>2]|0;l=j+(c[g+4>>2]|0)|0;q=f;r=f;s=f+8|0;t=f+10|0;u=f+12|0;eN(f|0,0,16);b[t>>1]=1;b[u>>1]=257;b[s>>1]=0;v=f;w=f;x=f;y=1;z=0;A=-1;B=0;C=l;l=j;j=g+8|0;g=h-1|0;h=k;L72:while(1){if(l>>>0<C>>>0){D=C;E=l;F=j;G=g}else{if((g|0)==0){H=67;break}I=c[j>>2]|0;D=I+(c[j+4>>2]|0)|0;E=I;F=j+8|0;G=g-1|0}I=E+1|0;J=a[E]|0;K=e[n>>1]|0;L=q+(K<<4)|0;L78:do{if((L|0)==(r|0)){M=h;N=B;O=A;P=y;Q=n;H=103}else{R=h;S=B;T=A;U=y;V=n;W=K;X=L;while(1){Y=q+(W<<4)+8|0;Z=b[Y>>1]|0;do{if(Z<<16>>16==0){_=q+(U<<4)|0;a[_|0]=J;a[q+(U<<4)+1|0]=2;b[q+(U<<4)+2>>1]=2;eN(q+(U<<4)+4|0,0,12);b[Y>>1]=(_-X|0)>>>4&65535;$=0;aa=0;ac=_;ad=U+1|0}else{_=q+((Z&65535)+W<<4)|0;ae=0;L84:while(1){af=a[_|0]|0;if((J&255)<(af&255)){ag=_;while(1){ah=ag+2|0;b[ah>>1]=(b[ah>>1]|0)+2&65535;ai=ag+4|0;ah=b[ai>>1]|0;if(ah<<16>>16==0){H=76;break L84}aj=ag+((ah&65535)<<4)|0;ah=a[aj|0]|0;if((J&255)<(ah&255)){ag=aj}else{ak=aj;al=ah;break}}}else{ak=_;al=af}if((J&255)<=(al&255)){H=81;break}am=(b[ak+2>>1]|0)+ae&65535;an=ak+6|0;ah=b[an>>1]|0;if(ah<<16>>16==0){H=80;break}_=ak+((ah&65535)<<4)|0;ae=am}if((H|0)==76){H=0;_=q+(U<<4)|0;a[_|0]=J;a[q+(U<<4)+1|0]=2;b[q+(U<<4)+2>>1]=2;eN(q+(U<<4)+4|0,0,12);b[ai>>1]=(_-ag|0)>>>4&65535;$=ae;aa=0;ac=_;ad=U+1|0;break}else if((H|0)==80){H=0;_=q+(U<<4)|0;a[_|0]=J;a[q+(U<<4)+1|0]=2;b[q+(U<<4)+2>>1]=2;eN(q+(U<<4)+4|0,0,12);b[an>>1]=(_-ak|0)>>>4&65535;$=am;aa=0;ac=_;ad=U+1|0;break}else if((H|0)==81){H=0;_=ak+1|0;ah=d[_]|0;aj=ak+2|0;ao=b[aj>>1]|0;b[aj>>1]=ao+2&65535;a[_]=(a[_]|0)+2&255;$=(ae&65535)-ah+(ao&65535)&65535;aa=ah;ac=ak;ad=U;break}}}while(0);b[V>>1]=(ac-x|0)>>>4&65535;Z=ac+14|0;ah=q+(W<<4)+12|0;ao=b[ah>>1]|0;_=(aa|0)!=0;L98:do{if(_){aj=(T>>>0)/((ao&65535)>>>0)|0;ap=(ab((e[q+(W<<4)+10>>1]|0)+($&65535)|0,aj)|0)+S|0;aq=ab(aj,aa)|0;aj=ap;ap=R;while(1){if((aq+aj^aj)>>>0>16777215){if(aq>>>0>65535){ar=aq;as=aj;at=ap;break L98}au=-aj&65535}else{au=aq}if(ap>>>0>=o>>>0){p=0;H=135;break L72}a[ap]=aj>>>24&255;aq=au<<8;aj=aj<<8;ap=ap+1|0}}else{ap=q+(W<<4)+10|0;aj=b[ap>>1]|0;L108:do{if(aj<<16>>16!=0&(aj&65535)<(ao&65535)){aq=ab((T>>>0)/((ao&65535)>>>0)|0,aj&65535)|0;ae=S;av=R;while(1){if((aq+ae^ae)>>>0>16777215){if(aq>>>0>65535){aw=aq;ax=ae;ay=av;break L108}az=-ae&65535}else{az=aq}if(av>>>0>=o>>>0){p=0;H=136;break L72}a[av]=ae>>>24&255;aq=az<<8;ae=ae<<8;av=av+1|0}}else{aw=T;ax=S;ay=R}}while(0);b[ap>>1]=(b[ap>>1]|0)+5&65535;b[ah>>1]=(b[ah>>1]|0)+5&65535;ar=aw;as=ax;at=ay}}while(0);ao=(b[ah>>1]|0)+2&65535;b[ah>>1]=ao;if(aa>>>0>251|(ao&65535)>65280){ao=b[Y>>1]|0;if(ao<<16>>16==0){aA=0}else{aA=cn(q+((ao&65535)+W<<4)|0)|0}b[ah>>1]=aA;ao=q+(W<<4)+10|0;aj=b[ao>>1]|0;av=aj-((aj&65535)>>>1)&65535;b[ao>>1]=av;b[ah>>1]=av+(b[ah>>1]|0)&65535}if(_){aB=ad;aC=ar;aD=as;aE=at;break L78}av=e[q+(W<<4)+14>>1]|0;ao=q+(av<<4)|0;if((ao|0)==(r|0)){M=at;N=as;O=ar;P=ad;Q=Z;H=103;break}else{R=at;S=as;T=ar;U=ad;V=Z;W=av;X=ao}}}}while(0);do{if((H|0)==103){H=0;L=J&255;K=b[s>>1]|0;do{if(K<<16>>16==0){X=q+(P<<4)|0;a[X|0]=J;a[q+(P<<4)+1|0]=3;b[q+(P<<4)+2>>1]=3;eN(q+(P<<4)+4|0,0,12);b[s>>1]=(X-v|0)>>>4&65535;aF=L;aG=1;aH=X;aI=P+1|0}else{X=r+((K&65535)<<4)|0;W=L;L131:while(1){V=a[X|0]|0;if((J&255)<(V&255)){aJ=X;while(1){U=aJ+2|0;b[U>>1]=(b[U>>1]|0)+3&65535;aK=aJ+4|0;U=b[aK>>1]|0;if(U<<16>>16==0){H=109;break L131}T=aJ+((U&65535)<<4)|0;U=a[T|0]|0;if((J&255)<(U&255)){aJ=T}else{aL=T;aM=U;break}}}else{aL=X;aM=V}if((J&255)<=(aM&255)){H=114;break}aN=(b[aL+2>>1]|0)+W&65535;aO=aL+6|0;ap=b[aO>>1]|0;if(ap<<16>>16==0){H=113;break}X=aL+((ap&65535)<<4)|0;W=aN}if((H|0)==109){H=0;X=q+(P<<4)|0;a[X|0]=J;a[q+(P<<4)+1|0]=3;b[q+(P<<4)+2>>1]=3;eN(q+(P<<4)+4|0,0,12);b[aK>>1]=(X-aJ|0)>>>4&65535;aF=W;aG=1;aH=X;aI=P+1|0;break}else if((H|0)==113){H=0;X=q+(P<<4)|0;a[X|0]=J;a[q+(P<<4)+1|0]=3;b[q+(P<<4)+2>>1]=3;eN(q+(P<<4)+4|0,0,12);b[aO>>1]=(X-aL|0)>>>4&65535;aF=aN;aG=1;aH=X;aI=P+1|0;break}else if((H|0)==114){H=0;X=aL+1|0;Z=d[X]|0;_=aL+2|0;ah=b[_>>1]|0;b[_>>1]=ah+3&65535;a[X]=(a[X]|0)+3&255;aF=(W&65535)-Z+(ah&65535)&65535;aG=Z+1|0;aH=aL;aI=P;break}}}while(0);b[Q>>1]=(aH-w|0)>>>4&65535;L=(O>>>0)/((e[u>>1]|0)>>>0)|0;K=(ab((e[t>>1]|0)+(aF&65535)|0,L)|0)+N|0;Z=ab(L,aG)|0;L=K;K=M;while(1){if((Z+L^L)>>>0>16777215){if(Z>>>0>65535){break}aP=-L&65535}else{aP=Z}if(K>>>0>=o>>>0){p=0;H=137;break L72}a[K]=L>>>24&255;Z=aP<<8;L=L<<8;K=K+1|0}ah=(b[u>>1]|0)+3&65535;b[u>>1]=ah;if(!(aG>>>0>250|(ah&65535)>65280)){aB=aI;aC=Z;aD=L;aE=K;break}ah=b[s>>1]|0;if(ah<<16>>16==0){aQ=0}else{aQ=cn(r+((ah&65535)<<4)|0)|0}b[u>>1]=aQ;ah=b[t>>1]|0;X=ah-((ah&65535)>>>1)&65535;b[t>>1]=X;b[u>>1]=((b[u>>1]|0)+256&65535)+X&65535;aB=aI;aC=Z;aD=L;aE=K}}while(0);if(z>>>0>1){b[n>>1]=b[q+((e[n>>1]|0)<<4)+14>>1]|0;aR=z}else{aR=z+1|0}if(aB>>>0<=4093){y=aB;z=aR;A=aC;B=aD;C=D;l=I;j=F;g=G;h=aE;continue}eN(f|0,0,16);b[t>>1]=1;b[u>>1]=257;b[s>>1]=0;b[n>>1]=0;y=1;z=0;A=aC;B=aD;C=D;l=I;j=F;g=G;h=aE}if((H|0)==67){L165:do{if((B|0)==0){aS=h}else{aE=h;G=B;while(1){if(aE>>>0>=o>>>0){p=0;break}g=aE+1|0;a[aE]=G>>>24&255;F=G<<8;if((F|0)==0){aS=g;break L165}else{aE=g;G=F}}i=m;return p|0}}while(0);p=aS-k|0;i=m;return p|0}else if((H|0)==135){i=m;return p|0}else if((H|0)==136){i=m;return p|0}else if((H|0)==137){i=m;return p|0}return 0}function cn(c){c=c|0;var d=0,f=0,g=0,h=0,i=0;d=0;f=c;while(1){c=f+1|0;g=a[c]|0;h=g-((g&255)>>>1)&255;a[c]=h;c=f+2|0;b[c>>1]=h&255;h=b[f+4>>1]|0;if(h<<16>>16!=0){g=cn(f+((h&65535)<<4)|0)|0;b[c>>1]=(b[c>>1]|0)+g&65535}i=(e[c>>1]|0)+d|0;c=b[f+6>>1]|0;if(c<<16>>16==0){break}d=i&65535;f=f+((c&65535)<<4)|0}return i&65535|0}function co(c,f,g,h,j){c=c|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0,aJ=0,aK=0,aL=0,aM=0,aN=0,aO=0,aP=0,aQ=0,aR=0,aS=0,aT=0,aU=0,aV=0,aW=0,aX=0,aY=0,aZ=0,a_=0,a$=0,a0=0,a1=0,a2=0,a3=0,a4=0,a5=0,a6=0,a7=0,a8=0,a9=0,ba=0,bb=0,bc=0,bd=0,be=0,bf=0,bg=0,bh=0,bi=0,bj=0,bk=0,bl=0,bm=0,bn=0;k=i;i=i+8|0;l=k|0;m=h+j|0;j=f+g|0;b[l>>1]=0;if((c|0)==0|(g|0)==0){n=0;i=k;return n|0}o=c;p=c;q=c+8|0;r=c+10|0;s=c+12|0;eN(c|0,0,16);b[r>>1]=1;b[s>>1]=257;b[q>>1]=0;if((g|0)>0){t=f+1|0;u=(d[f]|0)<<24}else{t=f;u=0}if(t>>>0<j>>>0){v=t+1|0;w=(d[t]|0)<<16|u}else{v=t;w=u}if(v>>>0<j>>>0){x=v+1|0;y=(d[v]|0)<<8|w}else{x=v;y=w}if(x>>>0<j>>>0){z=x+1|0;A=d[x]|0|y}else{z=x;A=y}y=c;x=c;w=c;v=c;u=z;z=h;t=0;f=1;g=0;B=-1;C=A;L199:while(1){A=b[l>>1]|0;D=A&65535;L201:do{if((o+(D<<4)|0)==(p|0)){E=C;F=B;G=t;H=u;I=A;J=187}else{K=C;L=B;M=t;N=u;O=A;P=D;L202:while(1){Q=o+(P<<4)+10|0;R=b[Q>>1]|0;S=R&65535;L204:do{if(R<<16>>16==0){T=N;U=M;V=L;W=K}else{X=o+(P<<4)+12|0;Y=b[X>>1]|0;if((R&65535)>=(Y&65535)){T=N;U=M;V=L;W=K;break}Z=(L>>>0)/((Y&65535)>>>0)|0;_=((K-M|0)>>>0)/(Z>>>0)|0;if((_&65535)>>>0>=S>>>0){break L202}Y=N;$=M;aa=ab(Z,S)|0;ac=K;while(1){if(($+aa^$)>>>0>16777215){if(aa>>>0>65535){T=Y;U=$;V=aa;W=ac;break L204}ad=-$&65535}else{ad=aa}ae=ac<<8;if(Y>>>0<j>>>0){af=Y+1|0;ag=d[Y]|0|ae}else{af=Y;ag=ae}Y=af;$=$<<8;aa=ad<<8;ac=ag}}}while(0);R=b[o+(P<<4)+14>>1]|0;ac=R&65535;if((o+(ac<<4)|0)==(p|0)){E=W;F=V;G=U;H=T;I=R;J=187;break L201}else{K=W;L=V;M=U;N=T;O=R;P=ac}}L=o+(P<<4)+8|0;ac=b[L>>1]|0;if(ac<<16>>16==0){n=0;J=247;break L199}R=_-S&65535;aa=o+((ac&65535)+P<<4)|0;ac=0;L220:while(1){$=aa+2|0;Y=b[$>>1]|0;ae=Y+ac&65535;ah=ae&65535;if(R>>>0<ah>>>0){ai=$;$=Y;aj=aa;Y=ah;while(1){ak=a[aj|0]|0;al=aj+1|0;am=a[al]|0;an=am&255;ao=Y-an|0;b[ai>>1]=$+2&65535;if((R|0)>=(ao|0)){break L220}ah=b[aj+4>>1]|0;if(ah<<16>>16==0){n=0;J=249;break L199}ap=ah&65535;ah=aj+(ap<<4)|0;aq=aj+(ap<<4)+2|0;ap=b[aq>>1]|0;ar=ap+ac&65535;as=ar&65535;if(R>>>0<as>>>0){ai=aq;$=ap;aj=ah;Y=as}else{at=ah;au=ar;break}}}else{at=aa;au=ae}Y=b[at+6>>1]|0;if(Y<<16>>16==0){n=0;J=248;break L199}aa=at+((Y&65535)<<4)|0;ac=au}a[al]=(a[al]|0)+2&255;ac=(aj-v|0)>>>4;aa=(ab((e[Q>>1]|0)+(ao&65535)|0,Z)|0)+M|0;R=N;Y=aa;aa=ab(an,Z)|0;$=K;while(1){if((Y+aa^Y)>>>0>16777215){if(aa>>>0>65535){break}av=-Y&65535}else{av=aa}ai=$<<8;if(R>>>0<j>>>0){aw=R+1|0;ax=d[R]|0|ai}else{aw=R;ax=ai}R=aw;Y=Y<<8;aa=av<<8;$=ax}K=ac&65535;N=(b[X>>1]|0)+2&65535;b[X>>1]=N;if(!((am&255)>251|(N&65535)>65280)){ay=R;az=Y;aA=K;aB=ak;aC=f;aD=aa;aE=$;aF=O;break}N=b[L>>1]|0;if(N<<16>>16==0){aG=0}else{aG=cn(o+((N&65535)+P<<4)|0)|0}b[X>>1]=aG;N=b[Q>>1]|0;M=N-((N&65535)>>>1)&65535;b[Q>>1]=M;b[X>>1]=M+(b[X>>1]|0)&65535;ay=R;az=Y;aA=K;aB=ak;aC=f;aD=aa;aE=$;aF=O}}while(0);do{if((J|0)==187){J=0;aH=(F>>>0)/((e[s>>1]|0)>>>0)|0;D=((E-G|0)>>>0)/(aH>>>0)|0;aI=e[r>>1]|0;if((D&65535)>>>0<aI>>>0){J=188;break L199}A=D-aI|0;D=b[q>>1]|0;do{if(D<<16>>16==0){K=A&255;M=o+(f<<4)|0;a[M|0]=K;a[o+(f<<4)+1|0]=3;b[o+(f<<4)+2>>1]=3;eN(o+(f<<4)+4|0,0,12);b[q>>1]=(M-y|0)>>>4&65535;aJ=1;aK=A&65535;aL=K;aM=M;aN=f+1|0}else{M=A&65535;K=p+((D&65535)<<4)|0;N=0;L250:while(1){ai=K+2|0;ar=b[ai>>1]|0;ah=(ar&65535)+N|0;as=K|0;ap=a[as]|0;aq=(ap&255)+1|0;aO=aq+ah|0;aP=aO&65535;if(M>>>0<aP>>>0){aQ=ai;aR=ar;aS=as;aT=ap;aU=K;ap=aP;while(1){aV=aU+1|0;aW=(d[aV]|0)+1|0;aX=ap-aW|0;if((M|0)>=(aX|0)){J=204;break L250}b[aQ>>1]=aR+3&65535;aY=aU+4|0;aP=b[aY>>1]|0;if(aP<<16>>16==0){J=203;break L250}as=aP&65535;aP=aU+(as<<4)|0;ar=aU+(as<<4)+2|0;as=b[ar>>1]|0;ai=(as&65535)+N|0;aZ=aP|0;a_=a[aZ]|0;a$=(a_&255)+1|0;a0=a$+ai|0;a1=a0&65535;if(M>>>0<a1>>>0){aQ=ar;aR=as;aS=aZ;aT=a_;aU=aP;ap=a1}else{a2=aP;a3=ai;a4=a$;a5=a0;break}}}else{a2=K;a3=ah;a4=aq;a5=aO}a6=a2+6|0;ap=b[a6>>1]|0;if(ap<<16>>16==0){J=199;break}K=a2+((ap&65535)<<4)|0;N=a3&65535}if((J|0)==199){J=0;N=a4+A-a5&255;K=o+(f<<4)|0;a[K|0]=N;a[o+(f<<4)+1|0]=3;b[o+(f<<4)+2>>1]=3;eN(o+(f<<4)+4|0,0,12);b[a6>>1]=(K-a2|0)>>>4&65535;aJ=1;aK=A&65535;aL=N;aM=K;aN=f+1|0;break}else if((J|0)==203){J=0;K=A-aX+(d[aS]|0)&255;N=o+(f<<4)|0;a[N|0]=K;a[o+(f<<4)+1|0]=3;b[o+(f<<4)+2>>1]=3;eN(o+(f<<4)+4|0,0,12);b[aY>>1]=(N-aU|0)>>>4&65535;aJ=1;aK=A&65535;aL=K;aM=N;aN=f+1|0;break}else if((J|0)==204){J=0;b[aQ>>1]=aR+3&65535;a[aV]=(a[aV]|0)+3&255;aJ=aW;aK=aX&65535;aL=aT;aM=aU;aN=f;break}}}while(0);A=(aM-x|0)>>>4;D=(ab((e[r>>1]|0)+(aK&65535)|0,aH)|0)+G|0;O=H;$=D;D=ab(aJ,aH)|0;aa=E;while(1){if(($+D^$)>>>0>16777215){if(D>>>0>65535){break}a7=-$&65535}else{a7=D}Y=aa<<8;if(O>>>0<j>>>0){a8=O+1|0;a9=d[O]|0|Y}else{a8=O;a9=Y}O=a8;$=$<<8;D=a7<<8;aa=a9}Y=A&65535;R=(b[s>>1]|0)+3&65535;b[s>>1]=R;if(!(aJ>>>0>250|(R&65535)>65280)){ay=O;az=$;aA=Y;aB=aL;aC=aN;aD=D;aE=aa;aF=I;break}R=b[q>>1]|0;if(R<<16>>16==0){ba=0}else{ba=cn(p+((R&65535)<<4)|0)|0}b[s>>1]=ba;R=b[r>>1]|0;P=R-((R&65535)>>>1)&65535;b[r>>1]=P;b[s>>1]=((b[s>>1]|0)+256&65535)+P&65535;ay=O;az=$;aA=Y;aB=aL;aC=aN;aD=D;aE=aa;aF=I}}while(0);Y=b[l>>1]|0;if(Y<<16>>16==aF<<16>>16){bb=aC;bc=l}else{P=aC;R=l;L=Y;while(1){Y=L&65535;ac=o+(Y<<4)+8|0;N=b[ac>>1]|0;do{if(N<<16>>16==0){K=o+(P<<4)|0;a[K|0]=aB;a[o+(P<<4)+1|0]=2;b[o+(P<<4)+2>>1]=2;eN(o+(P<<4)+4|0,0,12);b[ac>>1]=(K-(o+(Y<<4))|0)>>>4&65535;bd=0;be=K;bf=P+1|0}else{K=o+((N&65535)+Y<<4)|0;L285:while(1){M=a[K|0]|0;if((aB&255)<(M&255)){bg=K;while(1){ae=bg+2|0;b[ae>>1]=(b[ae>>1]|0)+2&65535;bh=bg+4|0;ae=b[bh>>1]|0;if(ae<<16>>16==0){J=223;break L285}ap=bg+((ae&65535)<<4)|0;ae=a[ap|0]|0;if((aB&255)<(ae&255)){bg=ap}else{bi=ap;bj=ae;break}}}else{bi=K;bj=M}if((aB&255)<=(bj&255)){J=228;break}bk=bi+6|0;aO=b[bk>>1]|0;if(aO<<16>>16==0){J=227;break}K=bi+((aO&65535)<<4)|0}if((J|0)==223){J=0;K=o+(P<<4)|0;a[K|0]=aB;a[o+(P<<4)+1|0]=2;b[o+(P<<4)+2>>1]=2;eN(o+(P<<4)+4|0,0,12);b[bh>>1]=(K-bg|0)>>>4&65535;bd=0;be=K;bf=P+1|0;break}else if((J|0)==227){J=0;K=o+(P<<4)|0;a[K|0]=aB;a[o+(P<<4)+1|0]=2;b[o+(P<<4)+2>>1]=2;eN(o+(P<<4)+4|0,0,12);b[bk>>1]=(K-bi|0)>>>4&65535;bd=0;be=K;bf=P+1|0;break}else if((J|0)==228){J=0;K=bi+1|0;aO=d[K]|0;aq=bi+2|0;b[aq>>1]=(b[aq>>1]|0)+2&65535;a[K]=(a[K]|0)+2&255;bd=aO;be=bi;bf=P;break}}}while(0);b[R>>1]=(be-w|0)>>>4&65535;N=be+14|0;if((bd|0)==0){aa=o+(Y<<4)+10|0;b[aa>>1]=(b[aa>>1]|0)+5&65535;aa=o+(Y<<4)+12|0;b[aa>>1]=(b[aa>>1]|0)+5&65535}aa=o+(Y<<4)+12|0;D=(b[aa>>1]|0)+2&65535;b[aa>>1]=D;if(bd>>>0>251|(D&65535)>65280){D=b[ac>>1]|0;if(D<<16>>16==0){bl=0}else{bl=cn(o+((D&65535)+Y<<4)|0)|0}b[aa>>1]=bl;D=o+(Y<<4)+10|0;$=b[D>>1]|0;O=$-(($&65535)>>>1)&65535;b[D>>1]=O;b[aa>>1]=O+(b[aa>>1]|0)&65535}aa=b[o+(Y<<4)+14>>1]|0;if(aa<<16>>16==aF<<16>>16){bb=bf;bc=N;break}else{P=bf;R=N;L=aa}}}b[bc>>1]=aA;if(z>>>0>=m>>>0){n=0;J=245;break}L=z+1|0;a[z]=aB;if(g>>>0>1){b[l>>1]=b[o+((e[l>>1]|0)<<4)+14>>1]|0;bm=g}else{bm=g+1|0}if(bb>>>0<=4093){u=ay;z=L;t=az;f=bb;g=bm;B=aD;C=aE;continue}eN(c|0,0,16);b[r>>1]=1;b[s>>1]=257;b[q>>1]=0;b[l>>1]=0;u=ay;z=L;t=az;f=1;g=0;B=aD;C=aE}if((J|0)==188){aE=H;H=G;G=ab(aI,aH)|0;while(1){if((H+G^H)>>>0>16777215){if(G>>>0>65535){break}bn=-H&65535}else{bn=G}aE=aE>>>0<j>>>0?aE+1|0:aE;H=H<<8;G=bn<<8}n=z-h|0;i=k;return n|0}else if((J|0)==245){i=k;return n|0}else if((J|0)==247){i=k;return n|0}else if((J|0)==248){i=k;return n|0}else if((J|0)==249){i=k;return n|0}return 0}function cp(a){a=a|0;var b=0,d=0,e=0,f=0;b=i;i=i+16|0;d=b|0;eN(d|0,0,16);e=ck()|0;c[d>>2]=e;if((e|0)==0){f=-1;i=b;return f|0}c[d+4>>2]=66;c[d+8>>2]=66;c[d+12>>2]=78;cu(a,d);f=0;i=b;return f|0}function cq(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;if(e>>>0>4095){i=0;return i|0}j=ch(10384)|0;k=j;if((j|0)==0){i=0;return i|0}eN(j|0,0,10384);l=e*380|0;m=ch(l)|0;n=j+36|0;c[n>>2]=m;if((m|0)==0){ci(j);i=0;return i|0}eN(m|0,0,l|0);l=dF(2)|0;m=j;c[m>>2]=l;L345:do{if((l|0)!=-1){do{if((d|0)==0){dG(l,1,1)|0;o=c[m>>2]|0;dG(o,2,1)|0;o=c[m>>2]|0;dG(o,3,262144)|0;o=c[m>>2]|0;dG(o,4,262144)|0}else{o=(dD(l,d)|0)<0;p=c[m>>2]|0;if(!o){dG(p,1,1)|0;o=c[m>>2]|0;dG(o,2,1)|0;o=c[m>>2]|0;dG(o,3,262144)|0;o=c[m>>2]|0;dG(o,4,262144)|0;o=d;q=j+4|0;r=c[o+4>>2]|0;c[q>>2]=c[o>>2];c[q+4>>2]=r;break}if((p|0)==-1){break L345}dK(p);break L345}}while(0);p=(f|0)==0;if(p|f>>>0>255){s=255}else{s=p?1:f}p=(bp(0)|0)+j|0;c[j+28>>2]=p<<16|p>>>16;c[j+44>>2]=s;c[j+12>>2]=g;c[j+16>>2]=h;c[j+20>>2]=0;c[j+32>>2]=0;c[j+24>>2]=1400;p=j+40|0;c[p>>2]=e;c[j+1608>>2]=0;c[j+10348>>2]=0;b[j+10352>>1]=0;eN(j+2132|0,0,24);eN(j+10356|0,0,28);cy(j+52|0);if((c[p>>2]|0)<=0){i=k;return i|0}r=c[n>>2]|0;while(1){c[r+8>>2]=k;b[r+14>>1]=((r-(c[n>>2]|0)|0)/380|0)&65535;a[r+21|0]=-1;a[r+20|0]=-1;c[r+32>>2]=0;cy(r+192|0);cy(r+200|0);cy(r+208|0);cy(r+216|0);cy(r+224|0);cy(r+232|0);cS(r);q=r+380|0;if(q>>>0<((c[n>>2]|0)+((c[p>>2]|0)*380|0)|0)>>>0){r=q}else{i=k;break}}return i|0}}while(0);ci(c[n>>2]|0);ci(j);i=0;return i|0}function cr(a){a=a|0;var b=0,d=0,e=0;if((a|0)==0){return}dK(c[a>>2]|0);b=a+36|0;d=a+40|0;if((c[d>>2]|0)>0){e=c[b>>2]|0;do{cS(e);e=e+380|0;}while(e>>>0<((c[b>>2]|0)+((c[d>>2]|0)*380|0)|0)>>>0)}d=c[a+2140>>2]|0;do{if((d|0)!=0){e=c[a+2152>>2]|0;if((e|0)==0){break}bv[e&127](d)}}while(0);ci(c[b>>2]|0);ci(a);return}function cs(d,e,f,g){d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;h=i;i=i+48|0;j=h|0;if((f|0)==0){k=1}else{k=f>>>0>255?255:f}f=d+36|0;l=c[f>>2]|0;m=d+40|0;n=l+((c[m>>2]|0)*380|0)|0;o=l;while(1){if(o>>>0>=n>>>0){break}if((c[o+36>>2]|0)==0){break}else{o=o+380|0}}if(o>>>0>=((c[f>>2]|0)+((c[m>>2]|0)*380|0)|0)>>>0){p=0;i=h;return p|0}m=ch(k*60|0)|0;f=o+40|0;c[f>>2]=m;if((m|0)==0){p=0;i=h;return p|0}c[o+44>>2]=k;c[o+36>>2]=1;m=e;e=o+24|0;n=c[m+4>>2]|0;c[e>>2]=c[m>>2];c[e+4>>2]=n;n=d+28|0;e=(c[n>>2]|0)+1|0;c[n>>2]=e;n=o+16|0;c[n>>2]=e;e=d+16|0;m=c[e>>2]|0;if((m|0)==0){c[o+180>>2]=32768}else{c[o+180>>2]=m>>>16<<12}m=o+180|0;l=c[m>>2]|0;do{if(l>>>0<4096){c[m>>2]=4096}else{if(l>>>0<=32768){break}c[m>>2]=32768}}while(0);if((k|0)>0){l=c[f>>2]|0;while(1){b[l>>1]=0;b[l+2>>1]=0;b[l+38>>1]=0;b[l+40>>1]=0;cy(l+44|0);cy(l+52|0);q=l+60|0;eN(l+4|0,0,34);if(q>>>0<((c[f>>2]|0)+(k*60|0)|0)>>>0){l=q}else{break}}}a[j|0]=-126;a[j+1|0]=-1;l=j+4|0;x=aG(b[o+14>>1]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;a[j+6|0]=a[o+21|0]|0;a[j+7|0]=a[o+20|0]|0;l=j+8|0;x=as(c[o+176>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+12|0;x=as(c[m>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+16|0;x=as(k|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+20|0;x=as(c[d+12>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+24|0;x=as(c[e>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+28|0;x=as(c[o+132>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+32|0;x=as(c[o+124>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+36|0;x=as(c[o+128>>2]|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+40|0;x=c[n>>2]|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;l=j+44|0;x=as(g|0)|0;a[l]=x&255;x=x>>8;a[l+1|0]=x&255;x=x>>8;a[l+2|0]=x&255;x=x>>8;a[l+3|0]=x&255;cK(o,j,0,0,0)|0;p=o;i=h;return p|0}function ct(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=a+36|0;f=a+40|0;if((c[f>>2]|0)>0){a=c[e>>2]|0;do{if((c[a+36>>2]|0)==5){cM(a,b,d)|0}a=a+380|0;}while(a>>>0<((c[e>>2]|0)+((c[f>>2]|0)*380|0)|0)>>>0)}if((c[d>>2]|0)!=0){return}cE(d);return}function cu(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;d=a+2140|0;e=d|0;f=c[e>>2]|0;do{if((f|0)!=0){g=c[a+2152>>2]|0;if((g|0)==0){break}bv[g&127](f)}}while(0);if((b|0)==0){c[e>>2]=0;return}else{e=d;d=b;c[e>>2]=c[d>>2];c[e+4>>2]=c[d+4>>2];c[e+8>>2]=c[d+8>>2];c[e+12>>2]=c[d+12>>2];return}}function cv(a,b){a=a|0;b=b|0;var d=0,e=0;d=(b|0)==0;if(d|b>>>0>255){e=255}else{e=d?1:b}c[a+44>>2]=e;return}function cw(a,b,d){a=a|0;b=b|0;d=d|0;c[a+12>>2]=b;c[a+16>>2]=d;c[a+32>>2]=1;return}function cx(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0;d=i;i=i+48|0;e=d|0;f=dy()|0;g=b+20|0;h=f-(c[g>>2]|0)|0;if(h>>>0<1e3){i=d;return}c[g>>2]=f;g=b+36|0;j=b+40|0;if((c[j>>2]|0)<=0){i=d;return}k=c[g>>2]|0;l=k+((c[j>>2]|0)*380|0)|0;m=0;n=0;o=k;k=0;while(1){if(((c[o+36>>2]|0)-5|0)>>>0<2){p=k+1|0;q=(c[o+48>>2]|0)==0?n:1;r=(c[o+68>>2]|0)+m|0}else{p=k;q=n;r=m}s=o+380|0;if(s>>>0<l>>>0){m=r;n=q;o=s;k=p}else{break}}if((p|0)==0){i=d;return}k=b+16|0;o=c[k>>2]|0;if((o|0)==0){t=-1}else{t=((ab(o,h)|0)>>>0)/1e3|0}o=(p|0)!=0;L456:do{if((q|0)==0|o^1){u=r;v=t;w=o;y=359}else{n=r;m=p;l=t;while(1){if(n>>>0<l>>>0){z=32}else{z=(l<<5>>>0)/(n>>>0)|0}if((c[j>>2]|0)<=0){break}s=n;A=m;B=l;C=0;D=c[g>>2]|0;while(1){do{if(((c[D+36>>2]|0)-5|0)>>>0<2){E=c[D+48>>2]|0;if((E|0)==0){F=C;G=B;H=A;I=s;break}J=D+60|0;if((c[J>>2]|0)==(f|0)){F=C;G=B;H=A;I=s;break}K=((ab(E,h)|0)>>>0)/1e3|0;E=D+68|0;L=c[E>>2]|0;if((ab(L,z)|0)>>>5>>>0<=K>>>0){F=C;G=B;H=A;I=s;break}M=(K<<5>>>0)/(L>>>0)|0;L=(M|0)==0?1:M;c[D+112>>2]=L;M=D+108|0;if((c[M>>2]|0)>>>0>L>>>0){c[M>>2]=L}c[J>>2]=f;c[D+64>>2]=0;c[E>>2]=0;F=1;G=B-K|0;H=A-1|0;I=s-K|0}else{F=C;G=B;H=A;I=s}}while(0);K=D+380|0;if(K>>>0<((c[g>>2]|0)+((c[j>>2]|0)*380|0)|0)>>>0){s=I;A=H;B=G;C=F;D=K}else{break}}D=(H|0)!=0;if((F|0)==0|D^1){u=I;v=G;w=D;y=359;break L456}else{n=I;m=H;l=G}}if((m|0)!=0){N=l;O=n;y=360}}}while(0);if((y|0)==359){if(w){N=v;O=u;y=360}}do{if((y|0)==360){if(O>>>0<N>>>0){P=32}else{P=(N<<5>>>0)/(O>>>0)|0}if((c[j>>2]|0)<=0){break}u=c[g>>2]|0;do{do{if(((c[u+36>>2]|0)-5|0)>>>0<2){if((c[u+60>>2]|0)==(f|0)){break}c[u+112>>2]=P;v=u+108|0;if((c[v>>2]|0)>>>0>P>>>0){c[v>>2]=P}c[u+64>>2]=0;c[u+68>>2]=0}}while(0);u=u+380|0;}while(u>>>0<((c[g>>2]|0)+((c[j>>2]|0)*380|0)|0)>>>0)}}while(0);P=b+32|0;if((c[P>>2]|0)==0){i=d;return}c[P>>2]=0;P=c[b+12>>2]|0;L497:do{if((P|0)==0|(p|0)==0){Q=0}else{b=p;O=P;while(1){N=(O>>>0)/(b>>>0)|0;if((c[j>>2]|0)<=0){break}y=b;u=O;n=0;l=c[g>>2]|0;while(1){do{if(((c[l+36>>2]|0)-5|0)>>>0<2){m=l+56|0;if((c[m>>2]|0)==(f|0)){R=n;S=u;T=y;break}v=l+52|0;w=c[v>>2]|0;if(!((w|0)==0|w>>>0<N>>>0)){R=n;S=u;T=y;break}c[m>>2]=f;R=1;S=u-(c[v>>2]|0)|0;T=y-1|0}else{R=n;S=u;T=y}}while(0);v=l+380|0;if(v>>>0<((c[g>>2]|0)+((c[j>>2]|0)*380|0)|0)>>>0){y=T;u=S;n=R;l=v}else{break}}if((T|0)==0|(R|0)==0){Q=N;break L497}else{b=T;O=S}}i=d;return}}while(0);if((c[j>>2]|0)<=0){i=d;return}S=e|0;T=e+1|0;R=e+8|0;P=e+4|0;p=e+4|0;O=c[g>>2]|0;do{if(((c[O+36>>2]|0)-5|0)>>>0<2){a[S]=-118;a[T]=-1;x=as(c[k>>2]|0)|0;a[R]=x&255;x=x>>8;a[R+1|0]=x&255;x=x>>8;a[R+2|0]=x&255;x=x>>8;a[R+3|0]=x&255;if((c[O+56>>2]|0)==(f|0)){x=as(c[O+52>>2]|0)|0;a[P]=x&255;x=x>>8;a[P+1|0]=x&255;x=x>>8;a[P+2|0]=x&255;x=x>>8;a[P+3|0]=x&255}else{x=as(Q|0)|0;a[p]=x&255;x=x>>8;a[p+1|0]=x&255;x=x>>8;a[p+2|0]=x&255;x=x>>8;a[p+3|0]=x&255}cK(O,e,0,0,0)|0}O=O+380|0;}while(O>>>0<((c[g>>2]|0)+((c[j>>2]|0)*380|0)|0)>>>0);i=d;return}function cy(a){a=a|0;var b=0;b=a|0;c[a>>2]=b;c[a+4>>2]=b;return}function cz(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=b;e=a+4|0;f=b+4|0;c[f>>2]=c[e>>2];c[b>>2]=a;c[c[f>>2]>>2]=d;c[e>>2]=d;return d|0}function cA(a){a=a|0;var b=0,d=0;b=a|0;d=a+4|0;c[c[d>>2]>>2]=c[b>>2];c[(c[b>>2]|0)+4>>2]=c[d>>2];return a|0}function cB(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=b;f=d;g=b+4|0;c[c[g>>2]>>2]=c[f>>2];c[(c[f>>2]|0)+4>>2]=c[g>>2];b=a+4|0;c[g>>2]=c[b>>2];c[f>>2]=a;c[c[g>>2]>>2]=e;c[b>>2]=d;return e|0}function cC(a){a=a|0;var b=0,d=0,e=0,f=0,g=0;b=a|0;d=c[a>>2]|0;if((d|0)==(b|0)){e=0;return e|0}else{f=0;g=d}while(1){d=f+1|0;a=c[g>>2]|0;if((a|0)==(b|0)){e=d;break}else{f=d;g=a}}return e|0}function cD(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=ch(24)|0;f=e;if((e|0)==0){g=0;return g|0}do{if((d&4|0)==0){if((b|0)==0){c[e+8>>2]=0;break}h=ch(b)|0;c[e+8>>2]=h;if((h|0)==0){ci(e);g=0;return g|0}else{if((a|0)==0){break}eO(h|0,a|0,b)|0;break}}else{c[e+8>>2]=a}}while(0);c[e>>2]=0;c[e+4>>2]=d;c[e+12>>2]=b;c[e+16>>2]=0;c[e+20>>2]=0;g=f;return g|0}function cE(a){a=a|0;var b=0;if((a|0)==0){return}b=c[a+16>>2]|0;if((b|0)!=0){bv[b&127](a)}do{if((c[a+4>>2]&4|0)==0){b=c[a+8>>2]|0;if((b|0)==0){break}ci(b)}}while(0);ci(a);return}function cF(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=a+12|0;do{if((c[d>>2]|0)>>>0<b>>>0){if((c[a+4>>2]&4|0)!=0){break}e=ch(b)|0;if((e|0)==0){f=-1;return f|0}g=a+8|0;h=c[g>>2]|0;i=c[d>>2]|0;eO(e|0,h|0,i)|0;ci(c[g>>2]|0);c[g>>2]=e;c[d>>2]=b;f=0;return f|0}}while(0);c[d>>2]=b;f=0;return f|0}function cG(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;if(!(a[248]|0)){cH()}if((e|0)==0){f=-1;g=~f;h=as(g|0)|0;return h|0}else{i=-1;j=b;k=e}while(1){e=k-1|0;b=c[j>>2]|0;l=c[j+4>>2]|0;m=b+l|0;if((l|0)>0){l=i;n=b;while(1){b=n+1|0;o=c[1048+(((d[n]|0)^l&255)<<2)>>2]^l>>>8;if(b>>>0<m>>>0){l=o;n=b}else{p=o;break}}}else{p=i}if((e|0)==0){f=p;break}else{i=p;j=j+8|0;k=e}}g=~f;h=as(g|0)|0;return h|0}function cH(){var b=0,d=0,e=0,f=0;b=0;do{d=cI(b,8)|0;e=d<<25;f=(d&128|0)!=0?e^79764919:e;e=f<<1;d=(f|0)<0?e^79764919:e;e=d<<1;f=(d|0)<0?e^79764919:e;e=f<<1;d=(f|0)<0?e^79764919:e;e=d<<1;f=(d|0)<0?e^79764919:e;e=f<<1;d=(f|0)<0?e^79764919:e;e=d<<1;f=(d|0)<0?e^79764919:e;e=f<<1;c[1048+(b<<2)>>2]=cI((f|0)<0?e^79764919:e,32)|0;b=b+1|0;}while((b|0)<256);a[248]=1;return}function cI(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;if((b|0)<=0){c=0;return c|0}d=b-1|0;e=a;a=0;f=0;while(1){if((e&1|0)==0){g=a}else{g=1<<d-f|a}h=f+1|0;if((h|0)<(b|0)){e=e>>1;a=g;f=h}else{c=g;break}}return c|0}function cJ(b,d,e,f){b=b|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0;g=i;i=i+48|0;h=g|0;c[b+132>>2]=d;c[b+124>>2]=e;c[b+128>>2]=f;a[h|0]=-117;a[h+1|0]=-1;j=h+4|0;x=as(d|0)|0;a[j]=x&255;x=x>>8;a[j+1|0]=x&255;x=x>>8;a[j+2|0]=x&255;x=x>>8;a[j+3|0]=x&255;j=h+8|0;x=as(e|0)|0;a[j]=x&255;x=x>>8;a[j+1|0]=x&255;x=x>>8;a[j+2|0]=x&255;x=x>>8;a[j+3|0]=x&255;j=h+12|0;x=as(f|0)|0;a[j]=x&255;x=x>>8;a[j+1|0]=x&255;x=x>>8;a[j+2|0]=x&255;x=x>>8;a[j+3|0]=x&255;cK(b,h,0,0,0)|0;i=g;return}function cK(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0;h=ch(84)|0;i=h;if((h|0)==0){j=0;return j|0}k=h+32|0;l=d|0;eO(k|0,l|0,48)|0;c[h+24>>2]=f;b[h+28>>1]=g;c[h+80>>2]=e;if((e|0)!=0){h=e|0;c[h>>2]=(c[h>>2]|0)+1}cN(a,i);j=i;return j|0}function cL(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0;d=c[a+152>>2]|0;e=c[a+160>>2]|0;if(d>>>0<=e>>>0){c[a+108>>2]=c[a+112>>2];f=0;return f|0}if(d>>>0>b>>>0){g=a+108|0;h=(c[g>>2]|0)+(c[a+124>>2]|0)|0;c[g>>2]=h;i=c[a+112>>2]|0;if(h>>>0<=i>>>0){f=1;return f|0}c[g>>2]=i;f=1;return f|0}else{if(((e<<1)+d|0)>>>0>=b>>>0){f=0;return f|0}b=a+108|0;d=c[b>>2]|0;e=c[a+128>>2]|0;c[b>>2]=d>>>0>e>>>0?d-e|0:0;f=-1;return f|0}return 0}function cM(d,e,f){d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0;g=i;i=i+56|0;h=g|0;j=g+48|0;k=e&255;l=c[d+40>>2]|0;if((c[d+36>>2]|0)!=5){m=-1;i=g;return m|0}if(k>>>0>=(c[d+44>>2]|0)>>>0){m=-1;i=g;return m|0}n=f+12|0;o=c[n>>2]|0;if(o>>>0>1073741824){m=-1;i=g;return m|0}p=((c[(c[d+8>>2]|0)+2136>>2]|0)==0?-28:-32)+(c[d+176>>2]|0)|0;if(o>>>0<=p>>>0){a[h+1|0]=e;q=c[f+4>>2]|0;L637:do{if((q&3|0)==2){a[h|0]=73;r=h+6|0;x=aG(c[n>>2]&65535|0)|0;a[r]=x&255;x=x>>8;a[r+1|0]=x&255}else{do{if((q&1|0)==0){if((b[l+(k*60|0)+2>>1]|0)==-1){break}a[h|0]=7;r=h+6|0;x=aG(c[n>>2]&65535|0)|0;a[r]=x&255;x=x>>8;a[r+1|0]=x&255;break L637}}while(0);a[h|0]=-122;r=h+4|0;x=aG(c[n>>2]&65535|0)|0;a[r]=x&255;x=x>>8;a[r+1|0]=x&255}}while(0);m=((cK(d,h,f,0,c[n>>2]&65535)|0)==0)<<31>>31;i=g;return m|0}h=((o-1+p|0)>>>0)/(p>>>0)|0;if(h>>>0>1048576){m=-1;i=g;return m|0}if((c[f+4>>2]&9|0)==8){o=b[l+(k*60|0)+2>>1]|0;if(o<<16>>16==-1){s=486}else{t=12;u=o}}else{s=486}if((s|0)==486){t=-120;u=b[l+(k*60|0)>>1]|0}k=aG(u+1&65535|0)|0;cy(j);u=c[n>>2]|0;L655:do{if((u|0)==0){v=0}else{l=j|0;s=p;o=0;q=0;r=u;while(1){w=r-q|0;y=w>>>0<s>>>0?w:s;w=ch(84)|0;if((w|0)==0){break}c[w+24>>2]=q;z=y&65535;b[w+28>>1]=z;c[w+80>>2]=f;a[w+32|0]=t;a[w+33|0]=e;A=w+36|0;x=k;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;A=w+38|0;x=aG(z|0)|0;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;A=w+40|0;x=as(h|0)|0;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;x=x>>8;a[A+2|0]=x&255;x=x>>8;a[A+3|0]=x&255;A=w+44|0;x=as(o|0)|0;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;x=x>>8;a[A+2|0]=x&255;x=x>>8;a[A+3|0]=x&255;A=w+48|0;x=as(c[n>>2]|0)|0;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;x=x>>8;a[A+2|0]=x&255;x=x>>8;a[A+3|0]=x&255;A=w+52|0;x=as(q|0)|0;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;x=x>>8;a[A+2|0]=x&255;x=x>>8;a[A+3|0]=x&255;cz(l,w)|0;w=o+1|0;A=y+q|0;z=c[n>>2]|0;if(A>>>0<z>>>0){s=y;o=w;q=A;r=z}else{v=w;break L655}}r=j|0;q=j|0;o=c[q>>2]|0;if((o|0)==(r|0)){m=-1;i=g;return m|0}else{B=o}while(1){ci(cA(B)|0);o=c[q>>2]|0;if((o|0)==(r|0)){m=-1;break}else{B=o}}i=g;return m|0}}while(0);B=f|0;c[B>>2]=(c[B>>2]|0)+v;v=j|0;B=j|0;j=c[B>>2]|0;if((j|0)==(v|0)){m=0;i=g;return m|0}else{C=j}while(1){cN(d,cA(C)|0);j=c[B>>2]|0;if((j|0)==(v|0)){m=0;break}else{C=j}}i=g;return m|0}function cN(f,g){f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;h=g+33|0;i=d[h]|0;j=c[f+40>>2]|0;k=j+(i*60|0)|0;l=g+32|0;m=c2(a[l]|0)|0;n=f+68|0;c[n>>2]=(e[g+28>>1]|0)+m+(c[n>>2]|0);do{if((a[h]|0)==-1){n=f+188|0;m=(b[n>>1]|0)+1&65535;b[n>>1]=m;b[g+8>>1]=m;b[g+10>>1]=0}else{m=d[l]|0;if((m&128|0)!=0){n=k|0;b[n>>1]=(b[n>>1]|0)+1&65535;b[j+(i*60|0)+2>>1]=0;b[g+8>>1]=b[n>>1]|0;b[g+10>>1]=0;break}if((m&64|0)!=0){m=f+246|0;b[m>>1]=(b[m>>1]|0)+1&65535;b[g+8>>1]=0;b[g+10>>1]=0;break}if((c[g+24>>2]|0)==0){m=j+(i*60|0)+2|0;b[m>>1]=(b[m>>1]|0)+1&65535}b[g+8>>1]=b[k>>1]|0;b[g+10>>1]=b[j+(i*60|0)+2>>1]|0}}while(0);b[g+30>>1]=0;c[g+12>>2]=0;c[g+16>>2]=0;c[g+20>>2]=0;i=g+34|0;x=aG(b[g+8>>1]|0)|0;a[i]=x&255;x=x>>8;a[i+1|0]=x&255;i=a[l]|0;j=i&15;if((j|0)==7){k=g+36|0;x=aG(b[g+10>>1]|0)|0;a[k]=x&255;x=x>>8;a[k+1|0]=x&255;o=524}else if((j|0)==9){j=g+36|0;x=aG(b[f+246>>1]|0)|0;a[j]=x&255;x=x>>8;a[j+1|0]=x&255;o=524}else{p=i}if((o|0)==524){p=a[l]|0}if(p<<24>>24<0){p=f+216|0;l=g;cz(p,l)|0;return}else{l=f+224|0;f=g;cz(l,f)|0;return}}function cO(b,d){b=b|0;d=d|0;var e=0,f=0;e=b+232|0;b=c[e>>2]|0;if((b|0)==(e|0)){f=0;return f|0}e=cA(b)|0;if((d|0)!=0){a[d]=a[e+13|0]|0}d=c[e+72>>2]|0;b=d|0;c[b>>2]=(c[b>>2]|0)-1;b=c[e+68>>2]|0;if((b|0)!=0){ci(b)}ci(e);f=d;return f|0}function cP(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0;b=a+240|0;if((c[b>>2]|0)!=0){d=a|0;cA(d)|0;c[b>>2]=0}b=a+192|0;d=b|0;e=c[d>>2]|0;if((e|0)!=(b|0)){f=e;do{ci(cA(f)|0);f=c[d>>2]|0;}while((f|0)!=(b|0))}cQ(a+200|0);cQ(a+208|0);cQ(a+216|0);cQ(a+224|0);cR(a+232|0);b=a+40|0;f=c[b>>2]|0;if((f|0)==0){c[b>>2]=0;g=a+44|0;c[g>>2]=0;return}d=a+44|0;if((c[d>>2]|0)==0){c[b>>2]=0;g=a+44|0;c[g>>2]=0;return}e=c[b>>2]|0;if(f>>>0<(e+((c[d>>2]|0)*60|0)|0)>>>0){h=f;while(1){cR(h+44|0);cR(h+52|0);f=h+60|0;i=c[b>>2]|0;if(f>>>0<(i+((c[d>>2]|0)*60|0)|0)>>>0){h=f}else{j=i;break}}}else{j=e}ci(j);c[b>>2]=0;g=a+44|0;c[g>>2]=0;return}function cQ(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;b=a|0;d=a|0;a=c[d>>2]|0;if((a|0)==(b|0)){return}else{e=a}do{a=cA(e)|0;f=a+80|0;g=c[f>>2]|0;do{if((g|0)!=0){h=g|0;c[h>>2]=(c[h>>2]|0)-1;h=c[f>>2]|0;if((c[h>>2]|0)!=0){break}cE(h)}}while(0);ci(a);e=c[d>>2]|0;}while((e|0)!=(b|0));return}function cR(a){a=a|0;c$(c[a>>2]|0,a|0);return}function cS(a){a=a|0;b[a+12>>1]=4095;c[a+16>>2]=0;c[a+36>>2]=0;eN(a+48|0,0,60);c[a+108>>2]=32;c[a+112>>2]=32;c[a+116>>2]=0;c[a+120>>2]=0;c[a+124>>2]=2;c[a+128>>2]=2;c[a+132>>2]=5e3;c[a+136>>2]=500;c[a+140>>2]=32;c[a+144>>2]=5e3;c[a+148>>2]=3e4;c[a+152>>2]=500;c[a+156>>2]=500;c[a+160>>2]=0;c[a+164>>2]=0;c[a+168>>2]=500;c[a+172>>2]=0;c[a+176>>2]=c[(c[a+8>>2]|0)+24>>2];c[a+184>>2]=0;b[a+188>>1]=0;c[a+180>>2]=32768;eN(a+244|0,0,136);cP(a);return}function cT(b){b=b|0;var d=0,e=0;d=i;i=i+48|0;e=d|0;if((c[b+36>>2]|0)!=5){i=d;return}a[e|0]=-123;a[e+1|0]=-1;cK(b,e,0,0,0)|0;i=d;return}function cU(a,b){a=a|0;b=b|0;c[a+136>>2]=(b|0)!=0?b:500;return}function cV(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;c[a+140>>2]=(b|0)!=0?b:32;c[a+144>>2]=(d|0)!=0?d:5e3;c[a+148>>2]=(e|0)!=0?e:3e4;return}function cW(b,d){b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+48|0;f=e|0;g=c[b+36>>2]|0;if((g|0)==0){i=e;return}else if(!((g|0)==9|(g|0)==7)){cP(b);a[f|0]=68;a[f+1|0]=-1;g=f+4|0;x=as(d|0)|0;a[g]=x&255;x=x>>8;a[g+1|0]=x&255;x=x>>8;a[g+2|0]=x&255;x=x>>8;a[g+3|0]=x&255;cK(b,f,0,0,0)|0;c3(c[b+8>>2]|0)}cS(b);i=e;return}function cX(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+48|0;f=e|0;g=b+36|0;h=c[g>>2]|0;if((h|0)==7|(h|0)==0|(h|0)==8|(h|0)==9){i=e;return}cP(b);h=f|0;a[h]=4;a[f+1|0]=-1;j=f+4|0;x=as(d|0)|0;a[j]=x&255;x=x>>8;a[j+1|0]=x&255;x=x>>8;a[j+2|0]=x&255;x=x>>8;a[j+3|0]=x&255;a[h]=(((c[g>>2]|0)-5|0)>>>0<2?-128:64)|a[h];cK(b,f,0,0,0)|0;if(((c[g>>2]|0)-5|0)>>>0<2){c[g>>2]=7;i=e;return}else{c3(c[b+8>>2]|0);cS(b);i=e;return}}function cY(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=a+36|0;L762:do{if(((c[d>>2]|0)-5|0)>>>0<2){e=a+216|0;do{if((c[e>>2]|0)==(e|0)){f=a+224|0;if((c[f>>2]|0)!=(f|0)){break}f=a+200|0;if((c[f>>2]|0)==(f|0)){break L762}}}while(0);c[d>>2]=6;c[a+376>>2]=b;return}}while(0);cX(a,b);return}function cZ(a,e,f){a=a|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0;g=d[e+1|0]|0;do{if(g>>>0<(c[a+44>>2]|0)>>>0){h=e+2|0;i=(d[h]|d[h+1|0]<<8)<<16>>16;h=(i&65535)>>>12;j=b[(c[a+40>>2]|0)+(g*60|0)+38>>1]|0;k=((i&65535)<(j&65535)?h|16:h)&65535;h=(j&65535)>>>12&65535;if(k>>>0<(h+7|0)>>>0|k>>>0>(h+8|0)>>>0){break}else{l=0}return l|0}}while(0);g=ch(60)|0;if((g|0)==0){l=0;return l|0}h=g;k=a+68|0;c[k>>2]=(c[k>>2]|0)+8;c[g+8>>2]=f&65535;f=g+12|0;k=e|0;eO(f|0,k|0,48)|0;cz(a+192|0,g)|0;l=h;return l|0}function c_(d,e){d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;f=e+52|0;g=f|0;h=c[g>>2]|0;if((h|0)==(f|0)){i=h;j=c[g>>2]|0;c$(j,i);return}k=e+38|0;l=e+40|0;e=d+232|0;m=d+240|0;n=d+8|0;o=d;p=h;q=h;r=h;L784:while(1){h=q;do{if((a[q+12|0]&15)==9){s=r;t=p}else{if((b[q+8>>1]|0)!=(b[k>>1]|0)){u=p;v=q;w=r;break L784}if((c[q+64>>2]|0)==0){b[l>>1]=b[h+10>>1]|0;s=r;t=p;break}if((p|0)==(q|0)){s=r;t=c[q>>2]|0;break}x=p;y=c[q+4>>2]|0;cB(e,x,y)|0;if((c[m>>2]|0)==0){y=(c[n>>2]|0)+52|0;cz(y,o)|0;c[m>>2]=1}y=c[q>>2]|0;s=y;t=y}}while(0);h=c[q>>2]|0;if((h|0)==(f|0)){u=t;v=h;w=s;break}else{p=t;q=h;r=s}}if((u|0)==(v|0)){i=w;j=c[g>>2]|0;c$(j,i);return}cB(d+232|0,u,c[v+4>>2]|0)|0;u=d+240|0;if((c[u>>2]|0)==0){w=(c[d+8>>2]|0)+52|0;s=d;cz(w,s)|0;c[u>>2]=1}i=c[v>>2]|0;j=c[g>>2]|0;c$(j,i);return}function c$(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==(b|0)){return}else{d=a}while(1){a=c[d>>2]|0;cA(d)|0;e=d+72|0;f=c[e>>2]|0;do{if((f|0)!=0){g=f|0;c[g>>2]=(c[g>>2]|0)-1;g=c[e>>2]|0;if((c[g>>2]|0)!=0){break}cE(g)}}while(0);e=c[d+68>>2]|0;if((e|0)!=0){ci(e)}ci(d);if((a|0)==(b|0)){break}else{d=a}}return}function c0(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0;e=d+44|0;f=e|0;g=c[f>>2]|0;L821:do{if((g|0)==(e|0)){h=g}else{i=d+38|0;j=g;while(1){if((c[j+64>>2]|0)!=0){h=j;break L821}k=b[j+8>>1]|0;if(k<<16>>16!=((b[i>>1]|0)+1&65535)<<16>>16){h=j;break L821}b[i>>1]=k;l=c[j+60>>2]|0;if((l|0)!=0){b[i>>1]=(k&65535)+65535+l&65535}l=c[j>>2]|0;if((l|0)==(e|0)){h=l;break}else{j=l}}}}while(0);if((h|0)==(c[f>>2]|0)){return}b[d+40>>1]=0;cB(a+232|0,c[f>>2]|0,c[h+4>>2]|0)|0;h=a+240|0;if((c[h>>2]|0)==0){f=(c[a+8>>2]|0)+52|0;e=a;cz(f,e)|0;c[h>>2]=1}c_(a,d);return}function c1(f,g,h,i){f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;j=d[g+1|0]|0;k=c[f+40>>2]|0;l=k+(j*60|0)|0;L839:do{if((c[f+36>>2]|0)==6){m=686}else{n=g|0;if((a[n]&15)==9){o=0}else{p=g+2|0;q=(d[p]|d[p+1|0]<<8)<<16>>16;p=(q&65535)>>>12;r=b[k+(j*60|0)+38>>1]|0;s=(r&65535)>>>12;t=(q&65535)<(r&65535)?p|16:p;if((t&65535)<(s&65535)){m=686;break}if((t&65535)>>>0<((s&65535)+7|0)>>>0){o=q&65535}else{m=686;break}}L845:do{switch(a[n]&15|0){case 9:{u=k+(j*60|0)+52|0;v=0;break};case 7:case 12:{q=g+4|0;s=aG((d[q]|d[q+1|0]<<8)<<16>>16|0)|0;q=k+(j*60|0)+38|0;if((o|0)==(e[q>>1]|0|0)){if((s&65535)<=(e[k+(j*60|0)+40>>1]|0)){m=686;break L839}}t=k+(j*60|0)+52|0;p=c[k+(j*60|0)+56>>2]|0;if((p|0)==(t|0)){u=p;v=s;break L845}r=(a[n]&15)==9;w=p;L852:while(1){p=w;do{if(!r){x=b[q>>1]|0;y=w+8|0;z=(e[y>>1]|0)<(x&65535);if(o>>>0<(x&65535)>>>0){if(!z){u=w;v=s;break L845}}else{if(z){break}}z=e[y>>1]|0;if(z>>>0<o>>>0){u=w;v=s;break L845}if(z>>>0>o>>>0){break}A=b[p+10>>1]|0;if((A&65535)<=(s&65535)){break L852}}}while(0);p=c[w+4>>2]|0;if((p|0)==(t|0)){u=p;v=s;break L845}else{w=p}}if((A&65535)<(s&65535)){u=w;v=s}else{m=686;break L839}break};case 8:case 6:{t=k+(j*60|0)+38|0;if((o|0)==(e[t>>1]|0|0)){m=686;break L839}q=k+(j*60|0)+44|0;r=c[k+(j*60|0)+48>>2]|0;if((r|0)==(q|0)){u=r;v=0;break L845}p=b[t>>1]|0;t=o>>>0<(p&65535)>>>0;z=r;while(1){r=z+8|0;y=(e[r>>1]|0)<(p&65535);if(t){if(y){m=656}else{u=z;v=0;break L845}}else{if(!y){m=656}}if((m|0)==656){m=0;B=e[r>>1]|0;if(B>>>0<=o>>>0){break}}r=c[z+4>>2]|0;if((r|0)==(q|0)){u=r;v=0;break L845}else{z=r}}if(B>>>0<o>>>0){u=z;v=0}else{m=686;break L839}break};default:{m=686;break L839}}}while(0);q=ch(76)|0;t=q;if((q|0)==0){break}p=g+2|0;b[q+8>>1]=(d[p]|d[p+1|0]<<8)<<16>>16;b[q+10>>1]=v;p=q+12|0;eO(p|0,n|0,48)|0;c[q+60>>2]=i;c[q+64>>2]=i;c[q+72>>2]=h;p=q+68|0;c[p>>2]=0;do{if((i|0)!=0){if(i>>>0<1048577){s=ch((i+31|0)>>>5<<2)|0;c[p>>2]=s;C=s}else{C=c[p>>2]|0}if((C|0)==0){ci(q);break L839}else{eN(C|0,0,(i+31|0)>>>5<<2|0);break}}}while(0);if((h|0)!=0){p=h|0;c[p>>2]=(c[p>>2]|0)+1}cz(c[u>>2]|0,q)|0;p=a[n]&15;if((p|0)==8|(p|0)==6){c0(f,l);D=t;return D|0}else{c_(f,l);D=t;return D|0}}}while(0);do{if((m|0)==686){if((i|0)!=0){break}if((h|0)==0){D=968;return D|0}if((c[h>>2]|0)!=0){D=968;return D|0}cE(h);D=968;return D|0}}while(0);if((h|0)==0){D=0;return D|0}if((c[h>>2]|0)!=0){D=0;return D|0}cE(h);D=0;return D|0}function c2(a){a=a|0;return c[312+((a&15)<<2)>>2]|0}function c3(a){a=a|0;c[a+48>>2]=dy()|0;c4(a,0,0)|0;return}function c4(a,f,g){a=a|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;h=i;i=i+8|0;j=h|0;k=j|0;l=j;m=j;n=a+60|0;c[n>>2]=1;o=a+36|0;p=a+40|0;q=a+68|0;r=a+1608|0;s=a+2132|0;t=a+64|0;u=(g|0)==0;g=a+48|0;v=a+48|0;w=a+1612|0;x=w|0;y=w|0;w=j+2|0;j=a+1616|0;z=a+2140|0;A=a+2136|0;B=a|0;C=a+10364|0;D=a+10368|0;E=a+6252|0;F=a+1620|0;G=a+1624|0;H=a+1616|0;I=a+2144|0;J=a+1620|0;K=a+6252|0;L=a+1616|0;M=a+48|0;N=(f|0)==0;O=f|0;L917:while(1){c[n>>2]=0;if((c[p>>2]|0)<=0){P=0;Q=754;break}R=c[o>>2]|0;do{S=c[R+36>>2]|0;L922:do{if(!((S|0)==0|(S|0)==9)){b[q>>1]=0;c[r>>2]=0;c[s>>2]=1;c[t>>2]=4;T=R+192|0;if((c[T>>2]|0)!=(T|0)){dr(a,R)}do{if(!u){T=R+200|0;if((c[T>>2]|0)==(T|0)){break}if(((c[M>>2]|0)-(c[R+80>>2]|0)|0)>>>0>86399999){break}if((ds(a,R,f)|0)!=1){break}if(N){break L922}if((c[O>>2]|0)==0){break L922}else{P=1;Q=755;break L917}}}while(0);T=R+216|0;if((c[T>>2]|0)==(T|0)){Q=719}else{if((dt(a,R)|0)!=0){Q=719}}do{if((Q|0)==719){Q=0;T=R+200|0;if((c[T>>2]|0)!=(T|0)){break}T=c[g>>2]|0;U=c[R+76>>2]|0;V=T-U|0;if((V>>>0>86399999?U-T|0:V)>>>0<(c[R+136>>2]|0)>>>0){break}if(((c[R+176>>2]|0)-(c[t>>2]|0)|0)>>>0<=3){break}cT(R);dt(a,R)|0}}while(0);V=R+224|0;if((c[V>>2]|0)!=(V|0)){du(a,R)}if((c[r>>2]|0)==0){break}V=R+88|0;T=c[V>>2]|0;U=c[v>>2]|0;do{if((T|0)==0){c[V>>2]=U}else{W=U-T|0;if((W>>>0>86399999?T-U|0:W)>>>0<=9999){break}W=R+92|0;X=c[W>>2]|0;if((X|0)==0){break}Y=R+96|0;Z=(c[Y>>2]<<16>>>0)/(X>>>0)|0;X=R+104|0;_=c[X>>2]|0;c[X>>2]=_-(_>>>2);_=R+100|0;$=c[_>>2]|0;if(Z>>>0<$>>>0){aa=$-(($-Z|0)>>>3)|0;c[_>>2]=aa;ab=(c[X>>2]|0)+((aa-Z|0)>>>2)|0}else{aa=((Z-$|0)>>>3)+$|0;c[_>>2]=aa;ab=(c[X>>2]|0)+((Z-aa|0)>>>2)|0}c[X>>2]=ab;c[V>>2]=c[v>>2];c[W>>2]=0;c[Y>>2]=0}}while(0);c[y>>2]=m;if((b[q>>1]|0)<0){b[w>>1]=aG(c[v>>2]&65535|0)|0;c[j>>2]=4}else{c[L>>2]=2}V=c[z>>2]|0;do{if((V|0)==0){ac=0}else{U=c[I>>2]|0;if((U|0)==0){ac=0;break}T=(c[t>>2]|0)-4|0;Y=bx[U&127](V,J,(c[s>>2]|0)-1|0,T,K,T)|0;if(!((Y|0)!=0&Y>>>0<T>>>0)){ac=0;break}b[q>>1]=b[q>>1]|16384;ac=Y}}while(0);V=R+12|0;if((e[V>>1]|0)<4095){b[q>>1]=d[R+20|0]<<12|b[q>>1]}b[k>>1]=aG(b[q>>1]|b[V>>1]|0)|0;if((c[A>>2]|0)!=0){Y=l+(c[H>>2]|0)|0;if((e[V>>1]|0)<4095){ad=c[R+16>>2]|0}else{ad=0}c[Y>>2]=ad;c[H>>2]=(c[H>>2]|0)+4;c[Y>>2]=bB[c[A>>2]&127](x,c[s>>2]|0)|0}if((ac|0)!=0){c[F>>2]=E;c[G>>2]=ac;c[s>>2]=2}c[R+72>>2]=c[v>>2];Y=dL(c[B>>2]|0,R+24|0,x,c[s>>2]|0)|0;dv(R);if((Y|0)<0){P=-1;Q=756;break L917}c[C>>2]=(c[C>>2]|0)+Y;c[D>>2]=(c[D>>2]|0)+1}}while(0);R=R+380|0;}while(R>>>0<((c[o>>2]|0)+((c[p>>2]|0)*380|0)|0)>>>0);if((c[n>>2]|0)==0){P=0;Q=753;break}}if((Q|0)==753){i=h;return P|0}else if((Q|0)==754){i=h;return P|0}else if((Q|0)==755){i=h;return P|0}else if((Q|0)==756){i=h;return P|0}return 0}function c5(a,b){a=a|0;b=b|0;var d=0;if((b|0)==0){d=-1;return d|0}c[b>>2]=0;c[b+4>>2]=0;c[b+16>>2]=0;d=c6(a,b)|0;return d|0}function c6(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=a+52|0;e=d|0;f=c[e>>2]|0;if((f|0)==(d|0)){g=0;return g|0}h=b+8|0;i=b+16|0;j=f;L994:while(1){k=cA(j)|0;l=k;m=k+240|0;c[m>>2]=0;n=k+36|0;f=c[n>>2]|0;do{if((f|0)==5){o=k+232|0;p=o;q=o;if((c[q>>2]|0)==(p|0)){break}o=cO(l,h)|0;c[i>>2]=o;if((o|0)!=0){r=770;break L994}}else if((f|0)==9){r=766;break L994}else if((f|0)==3|(f|0)==4){r=765;break L994}}while(0);f=c[e>>2]|0;if((f|0)==(d|0)){g=0;r=778;break}else{j=f}}if((r|0)==770){c[b>>2]=3;c[b+4>>2]=l;if((c[q>>2]|0)==(p|0)){g=1;return g|0}c[m>>2]=1;cz(d,k)|0;g=1;return g|0}else if((r|0)==766){c[a+32>>2]=1;c[b>>2]=2;c[b+4>>2]=l;c[b+12>>2]=c[k+376>>2];cS(l);g=1;return g|0}else if((r|0)==778){return g|0}else if((r|0)==765){c[n>>2]=5;c[b>>2]=1;c[b+4>>2]=l;c[b+12>>2]=c[k+376>>2];g=1;return g|0}return 0}function c7(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;e=i;i=i+8|0;f=e|0;g=(b|0)!=0;do{if(g){c[b>>2]=0;c[b+4>>2]=0;c[b+16>>2]=0;h=c6(a,b)|0;if((h|0)==1){j=1;break}else if((h|0)!=(-1|0)){k=782;break}bf(712);j=-1}else{k=782}}while(0);L1015:do{if((k|0)==782){h=dy()|0;l=a+48|0;c[l>>2]=h;m=h+d|0;h=a+20|0;n=a|0;while(1){o=c[l>>2]|0;p=c[h>>2]|0;q=o-p|0;if((q>>>0>86399999?p-o|0:q)>>>0>999){cx(a)}q=c4(a,b,1)|0;if((q|0)==1){j=1;break L1015}else if((q|0)==(-1|0)){k=786;break}q=c8(a,b)|0;if((q|0)==1){j=1;break L1015}else if((q|0)==(-1|0)){k=788;break}q=c4(a,b,1)|0;if((q|0)==1){j=1;break L1015}else if((q|0)==(-1|0)){k=790;break}if(g){q=c6(a,b)|0;if((q|0)==(-1|0)){k=793;break}else if((q|0)==1){j=1;break L1015}}q=dy()|0;c[l>>2]=q;if((q-m|0)>>>0<=86399999){j=0;break L1015}c[f>>2]=2;q=c[l>>2]|0;o=m-q|0;if((dO(c[n>>2]|0,f,o>>>0>86399999?q-m|0:o)|0)!=0){j=-1;break L1015}c[l>>2]=dy()|0;if((c[f>>2]|0)!=2){j=0;break L1015}}if((k|0)==793){bf(712);j=-1;break}else if((k|0)==790){bf(680);j=-1;break}else if((k|0)==788){bf(552);j=-1;break}else if((k|0)==786){bf(680);j=-1;break}}}while(0);i=e;return j|0}function c8(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;d=i;i=i+8|0;e=d|0;f=a+10356|0;g=a+2156|0;h=e|0;j=e+4|0;k=a|0;l=a+10348|0;m=a+10360|0;n=a+10372|0;o=a+10376|0;while(1){c[h>>2]=g;c[j>>2]=4096;p=dM(c[k>>2]|0,l,e,1)|0;if((p|0)<0){q=-1;r=804;break}if((p|0)==0){q=0;r=805;break}c[f>>2]=g;c[m>>2]=p;c[n>>2]=(c[n>>2]|0)+p;c[o>>2]=(c[o>>2]|0)+1;if((cj(a)|0)==0){q=0;r=807;break}p=c9(a,b)|0;if((p|0)==1|(p|0)==(-1|0)){q=p;r=806;break}}if((r|0)==804){i=d;return q|0}else if((r|0)==807){i=d;return q|0}else if((r|0)==806){i=d;return q|0}else if((r|0)==805){i=d;return q|0}return 0}function c9(f,g){f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0;h=i;i=i+16|0;j=h|0;k=h+8|0;l=f+10360|0;m=c[l>>2]|0;if(m>>>0<2){n=0;i=h;return n|0}o=c[f+10356>>2]|0;if((a[o]|0)==123){if((a[o+(m-1)|0]|0)==125){p=815}else{p=811}}else{p=811}do{if((p|0)==811){m=c[l>>2]|0;if(m>>>0<=2){break}o=c[f+10356>>2]|0;if((a[o]|0)!=123){break}q=a[o+(m-1)|0]|0;if(q<<24>>24==125){p=815;break}if(!(q<<24>>24!=10|(a[o+(m-2)|0]|0)!=125|(g|0)==0)){p=816}}}while(0);if((p|0)==815){if((g|0)!=0){p=816}}if((p|0)==816){c[g>>2]=100;c[g+12>>2]=0;c[g+16>>2]=cD(c[f+10356>>2]|0,c[l>>2]|0,4)|0;n=1;i=h;return n|0}m=f+10356|0;o=c[m>>2]|0;q=o;r=aG((d[q]|d[q+1|0]<<8)<<16>>16|0)|0;q=(r&65535)>>>12&3;s=r&4095;t=r&-16384&65535;r=t&32768;u=(r|0)==0;v=f+2136|0;w=(r>>>14)+((c[v>>2]|0)==0?2:6)|0;r=s&65535;do{if(s<<16>>16==4095){y=0}else{if(r>>>0>=(c[f+40>>2]|0)>>>0){n=0;i=h;return n|0}z=c[f+36>>2]|0;A=z+(r*380|0)|0;B=c[z+(r*380|0)+36>>2]|0;if((B|0)==0|(B|0)==9){n=0;i=h;return n|0}B=z+(r*380|0)+24|0;C=c[B>>2]|0;do{if((c[f+10348>>2]|0)==(C|0)){if((b[f+10352>>1]|0)==(b[z+(r*380|0)+28>>1]|0)){break}D=c[B>>2]|0;p=823}else{D=C;p=823}}while(0);do{if((p|0)==823){if((D|0)==-1){break}else{n=0}i=h;return n|0}}while(0);if((e[z+(r*380|0)+12>>1]|0)>=4095){y=A;break}if(q<<24>>24==(a[z+(r*380|0)+21|0]|0)){y=A;break}else{n=0}i=h;return n|0}}while(0);do{if((t&16384|0)!=0){r=c[f+2140>>2]|0;if((r|0)==0){n=0;i=h;return n|0}q=c[f+2148>>2]|0;if((q|0)==0){n=0;i=h;return n|0}D=f+6252|0;s=4096-w|0;C=by[q&127](r,(c[m>>2]|0)+w|0,(c[l>>2]|0)-w|0,f+6252+w|0,s)|0;if((C|0)==0|C>>>0>s>>>0){n=0;i=h;return n|0}else{eO(D|0,o|0,w)|0;c[m>>2]=D;c[l>>2]=C+w;break}}}while(0);do{if((c[v>>2]|0)!=0){t=(c[m>>2]|0)+(w-4)|0;C=c[t>>2]|0;if((y|0)==0){E=0}else{E=c[y+16>>2]|0}c[t>>2]=E;c[k>>2]=c[m>>2];c[k+4>>2]=c[l>>2];if((bB[c[v>>2]&127](k,1)|0)==(C|0)){break}else{n=0}i=h;return n|0}}while(0);if((y|0)!=0){c[y+24>>2]=c[f+10348>>2];b[y+28>>1]=b[f+10352>>1]|0;k=y+64|0;c[k>>2]=(c[k>>2]|0)+(c[l>>2]|0)}k=(c[m>>2]|0)+w|0;c[j>>2]=k;w=f+10380|0;v=(c[m>>2]|0)+(c[l>>2]|0)|0;L1104:do{if(k>>>0<v>>>0){E=o+2|0;C=y;t=k;D=v;while(1){s=t;if((t+4|0)>>>0>D>>>0){break L1104}r=a[t]&15;q=r&255;if((r&255)>12|r<<24>>24==0){break L1104}B=t+(c[312+(q<<2)>>2]|0)|0;if(B>>>0>D>>>0){break L1104}c[j>>2]=B;if(!((C|0)!=0|r<<24>>24==2)){break L1104}r=t+2|0;x=aG((d[r]|d[r+1|0]<<8)<<16>>16|0)|0;a[r]=x&255;x=x>>8;a[r+1|0]=x&255;switch(q|0){case 3:{if((dc(f,g,C,s)|0)==0){p=858}else{break L1104}break};case 4:{dd(f,C,s);p=858;break};case 5:{if((de(C)|0)==0){p=858}else{break L1104}break};case 6:{if((df(f,C,s,j)|0)==0){p=858}else{break L1104}break};case 1:{if((da(f,g,C,s)|0)==0){p=858}else{break L1104}break};case 2:{if((C|0)!=0){break L1104}if((c[w>>2]|0)!=0){break L1104}q=db(f,s)|0;if((q|0)==0){break L1104}else{F=q;p=859}break};case 7:{if((dg(f,C,s,j)|0)==0){p=858}else{break L1104}break};case 9:{if((dh(f,C,s,j)|0)==0){p=858}else{break L1104}break};case 8:{if((di(f,C,s,j)|0)==0){p=858}else{break L1104}break};case 10:{if((dj(f,C,s)|0)==0){p=858}else{break L1104}break};case 11:{if((dk(C,s)|0)==0){p=858}else{break L1104}break};case 12:{if((dl(f,C,s,j)|0)==0){p=858}else{break L1104}break};default:{break L1104}}if((p|0)==858){p=0;if((C|0)==0){G=0}else{F=C;p=859}}L1129:do{if((p|0)==859){p=0;q=a[t]|0;if(q<<24>>24>=0){G=F;break}if(u){break L1104}r=aG((d[E]|d[E+1|0]<<8)<<16>>16|0)|0;switch(c[F+36>>2]|0){case 8:{break};case 7:case 2:case 0:case 9:{G=F;break L1129;break};default:{cZ(F,s,r)|0;G=F;break L1129}}if((q&15)!=4){G=F;break}cZ(F,s,r)|0;G=F}}while(0);s=c[j>>2]|0;r=(c[m>>2]|0)+(c[l>>2]|0)|0;if(s>>>0<r>>>0){C=G;t=s;D=r}else{break L1104}}}}while(0);do{if((g|0)!=0){if((c[g>>2]|0)==0){break}else{n=1}i=h;return n|0}}while(0);n=0;i=h;return n|0}function da(b,e,f,g){b=b|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;h=f+36|0;i=c[h>>2]|0;if((i|0)==0|(i|0)==9){j=0;return j|0}i=g+6|0;k=(aG((d[i]|d[i+1|0]<<8)<<16>>16|0)|0)&65535;i=b+48|0;l=c[i>>2]|0;m=l&-65536|k;n=(k&32768)>>>0>(l&32768)>>>0?m-65536|0:m;if((l-n|0)>>>0>86399999){j=0;return j|0}c[f+76>>2]=l;c[f+84>>2]=0;l=c[i>>2]|0;m=l-n|0;k=m>>>0>86399999?n-l|0:m;cL(f,k)|0;m=f+172|0;l=c[m>>2]|0;c[m>>2]=l-(l>>>2);l=f+168|0;n=c[l>>2]|0;if(k>>>0<n>>>0){o=n-((n-k|0)>>>3)|0;c[l>>2]=o;p=(c[m>>2]|0)+((o-k|0)>>>2)|0}else{o=((k-n|0)>>>3)+n|0;c[l>>2]=o;p=(c[m>>2]|0)+((k-o|0)>>>2)|0}c[m>>2]=p;p=c[l>>2]|0;o=f+156|0;if(p>>>0<(c[o>>2]|0)>>>0){c[o>>2]=p}p=c[m>>2]|0;k=f+164|0;if(p>>>0>(c[k>>2]|0)>>>0){c[k>>2]=p}p=f+120|0;n=c[p>>2]|0;if((n|0)==0){q=893}else{r=c[i>>2]|0;s=r-n|0;if((s>>>0>86399999?n-r|0:s)>>>0>=(c[f+132>>2]|0)>>>0){q=893}}if((q|0)==893){c[f+152>>2]=c[o>>2];c[f+160>>2]=c[k>>2];c[o>>2]=c[l>>2];c[k>>2]=c[m>>2];c[p>>2]=c[i>>2]}i=g+4|0;p=aG((d[i]|d[i+1|0]<<8)<<16>>16|0)|0;i=dn(f,p,a[g+1|0]|0)|0;g=c[h>>2]|0;if((g|0)==7){if((i|0)!=4){j=-1;return j|0}dq(b,f,e);j=0;return j|0}else if((g|0)==2){if((i|0)!=3){j=-1;return j|0}dp(b,f,e);j=0;return j|0}else if((g|0)==6){g=f+216|0;if((c[g>>2]|0)!=(g|0)){j=0;return j|0}g=f+224|0;if((c[g>>2]|0)!=(g|0)){j=0;return j|0}g=f+200|0;if((c[g>>2]|0)!=(g|0)){j=0;return j|0}cX(f,c[f+376>>2]|0);j=0;return j|0}else{j=0;return j|0}return 0}function db(e,f){e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;g=i;i=i+48|0;h=g|0;j=f+16|0;k=as(d[j]|d[j+1|0]<<8|d[j+2|0]<<16|d[j+3|0]<<24|0)|0;if((k|0)==0|k>>>0>255){l=0;i=g;return l|0}j=e+36|0;m=c[j>>2]|0;n=e+40|0;L1193:do{if((c[n>>2]|0)>0){o=e+10348|0;p=e+10352|0;q=f+40|0;r=m;L1195:while(1){do{if((c[r+36>>2]|0)!=0){if((c[r+24>>2]|0)!=(c[o>>2]|0)){break}if((b[r+28>>1]|0)!=(b[p>>1]|0)){break}if((c[r+16>>2]|0)==(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)){l=0;break L1195}}}while(0);s=r+380|0;t=c[j>>2]|0;if(s>>>0<(t+((c[n>>2]|0)*380|0)|0)>>>0){r=s}else{u=t;break L1193}}i=g;return l|0}else{u=m}}while(0);m=(c[j>>2]|0)+((c[n>>2]|0)*380|0)|0;r=u;while(1){if(r>>>0>=m>>>0){break}if((c[r+36>>2]|0)==0){break}else{r=r+380|0}}if(r>>>0>=((c[j>>2]|0)+((c[n>>2]|0)*380|0)|0)>>>0){l=0;i=g;return l|0}n=c[e+44>>2]|0;j=k>>>0>n>>>0?n:k;k=ch(j*60|0)|0;n=r+40|0;c[n>>2]=k;if((k|0)==0){l=0;i=g;return l|0}c[r+44>>2]=j;c[r+36>>2]=2;k=f+40|0;m=r+16|0;c[m>>2]=d[k]|d[k+1|0]<<8|d[k+2|0]<<16|d[k+3|0]<<24;k=e+10348|0;u=r+24|0;q=c[k+4>>2]|0;c[u>>2]=c[k>>2];c[u+4>>2]=q;q=f+4|0;b[r+12>>1]=aG((d[q]|d[q+1|0]<<8)<<16>>16|0)|0;q=f+20|0;u=r+48|0;c[u>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=f+24|0;c[r+52>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=f+28|0;k=r+132|0;c[k>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=f+32|0;p=r+124|0;c[p>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=f+36|0;o=r+128|0;c[o>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=f+44|0;c[r+376>>2]=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=a[f+6|0]|0;if(q<<24>>24==-1){v=a[r+20|0]|0}else{v=q}q=v+1&3;t=r+20|0;if(q<<24>>24==(a[t]|0)){w=v+2&3}else{w=q}a[t]=w;t=a[f+7|0]|0;if(t<<24>>24==-1){y=a[r+21|0]|0}else{y=t}t=y+1&3;q=r+21|0;if(t<<24>>24==(a[q]|0)){z=y+2&3}else{z=t}a[q]=z;if((j|0)>0){q=c[n>>2]|0;while(1){b[q>>1]=0;b[q+2>>1]=0;b[q+38>>1]=0;b[q+40>>1]=0;cy(q+44|0);cy(q+52|0);t=q+60|0;eN(q+4|0,0,34);if(t>>>0<((c[n>>2]|0)+(j*60|0)|0)>>>0){q=t}else{break}}}q=f+8|0;n=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;if(n>>>0<576){A=576}else{A=n>>>0>4096?4096:n}n=r+176|0;c[n>>2]=A;A=e+16|0;q=c[A>>2]|0;do{if((q|0)==0){if((c[u>>2]|0)==0){c[r+180>>2]=32768;break}else{t=c[A>>2]|0;if((t|0)==0){B=946;break}else{C=t;B=945;break}}}else{C=q;B=945}}while(0);do{if((B|0)==945){q=c[u>>2]|0;if((q|0)==0){B=946;break}c[r+180>>2]=(C>>>0<q>>>0?C:q)>>>16<<12}}while(0);if((B|0)==946){B=c[A>>2]|0;C=c[u>>2]|0;c[r+180>>2]=(B>>>0>C>>>0?B:C)>>>16<<12}C=r+180|0;B=c[C>>2]|0;do{if(B>>>0<4096){c[C>>2]=4096}else{if(B>>>0<=32768){break}c[C>>2]=32768}}while(0);C=e+12|0;e=c[C>>2]|0;if((e|0)==0){D=32768}else{D=e>>>16<<12}e=f+12|0;f=as(d[e]|d[e+1|0]<<8|d[e+2|0]<<16|d[e+3|0]<<24|0)|0;e=D>>>0>f>>>0?f:D;if(e>>>0<4096){E=4096}else{E=e>>>0>32768?32768:e}a[h|0]=-125;a[h+1|0]=-1;e=h+4|0;x=aG(b[r+14>>1]|0)|0;a[e]=x&255;x=x>>8;a[e+1|0]=x&255;a[h+6|0]=w;a[h+7|0]=z;z=h+8|0;x=as(c[n>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+12|0;x=as(E|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+16|0;x=as(j|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+20|0;x=as(c[C>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+24|0;x=as(c[A>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+28|0;x=as(c[k>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+32|0;x=as(c[p>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+36|0;x=as(c[o>>2]|0)|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;z=h+40|0;x=c[m>>2]|0;a[z]=x&255;x=x>>8;a[z+1|0]=x&255;x=x>>8;a[z+2|0]=x&255;x=x>>8;a[z+3|0]=x&255;cK(r,h,0,0,0)|0;l=r;i=g;return l|0}function dc(e,f,g,h){e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0;if((c[g+36>>2]|0)!=1){i=0;return i|0}j=h+16|0;k=as(d[j]|d[j+1|0]<<8|d[j+2|0]<<16|d[j+3|0]<<24|0)|0;do{if(!((k|0)==0|k>>>0>255)){j=h+28|0;l=as(d[j]|d[j+1|0]<<8|d[j+2|0]<<16|d[j+3|0]<<24|0)|0;if((l|0)!=(c[g+132>>2]|0)){break}l=h+32|0;j=as(d[l]|d[l+1|0]<<8|d[l+2|0]<<16|d[l+3|0]<<24|0)|0;if((j|0)!=(c[g+124>>2]|0)){break}j=h+36|0;l=as(d[j]|d[j+1|0]<<8|d[j+2|0]<<16|d[j+3|0]<<24|0)|0;if((l|0)!=(c[g+128>>2]|0)){break}l=h+40|0;if((d[l]|d[l+1|0]<<8|d[l+2|0]<<16|d[l+3|0]<<24|0)!=(c[g+16>>2]|0)){break}dn(g,1,-1)|0;l=g+44|0;if(k>>>0<(c[l>>2]|0)>>>0){c[l>>2]=k}l=h+4|0;b[g+12>>1]=aG((d[l]|d[l+1|0]<<8)<<16>>16|0)|0;a[g+21|0]=a[h+6|0]|0;a[g+20|0]=a[h+7|0]|0;l=h+8|0;j=as(d[l]|d[l+1|0]<<8|d[l+2|0]<<16|d[l+3|0]<<24|0)|0;if(j>>>0<576){m=576}else{m=j>>>0>4096?4096:j}j=g+176|0;if(m>>>0<(c[j>>2]|0)>>>0){c[j>>2]=m}j=h+12|0;l=as(d[j]|d[j+1|0]<<8|d[j+2|0]<<16|d[j+3|0]<<24|0)|0;j=l>>>0<4096?4096:l;l=j>>>0>32768?32768:j;j=g+180|0;if(l>>>0<(c[j>>2]|0)>>>0){c[j>>2]=l}l=h+20|0;c[g+48>>2]=as(d[l]|d[l+1|0]<<8|d[l+2|0]<<16|d[l+3|0]<<24|0)|0;l=h+24|0;c[g+52>>2]=as(d[l]|d[l+1|0]<<8|d[l+2|0]<<16|d[l+3|0]<<24|0)|0;dp(e,g,f);i=0;return i|0}}while(0);c[g+376>>2]=0;dm(e,g,9);i=-1;return i|0}function dd(b,e,f){b=b|0;e=e|0;f=f|0;var g=0,h=0,i=0;g=e+36|0;h=c[g>>2]|0;if((h|0)==0|(h|0)==9|(h|0)==8){return}cP(e);L1286:do{switch(c[g>>2]|0){case 5:case 6:{if((a[f|0]|0)<0){c[g>>2]=8;break L1286}else{dm(b,e,9);i=991;break L1286}break};case 4:case 7:{dm(b,e,9);i=991;break};case 3:{c[b+32>>2]=1;i=987;break};default:{i=987}}}while(0);if((i|0)==987){cS(e);i=991}do{if((i|0)==991){if((c[g>>2]|0)!=0){break}return}}while(0);g=f+4|0;c[e+376>>2]=as(d[g]|d[g+1|0]<<8|d[g+2|0]<<16|d[g+3|0]<<24|0)|0;return}function de(a){a=a|0;return(((c[a+36>>2]|0)-5|0)>>>0>1)<<31>>31|0}function df(a,b,e,f){a=a|0;b=b|0;e=e|0;f=f|0;var g=0,h=0;if((d[e+1|0]|0)>>>0>=(c[b+44>>2]|0)>>>0){return-1|0}if(((c[b+36>>2]|0)-5|0)>>>0>=2){return-1|0}g=e+4|0;h=(aG((d[g]|d[g+1|0]<<8)<<16>>16|0)|0)&65535;g=(c[f>>2]|0)+h|0;c[f>>2]=g;f=c[a+10356>>2]|0;if(g>>>0<f>>>0){return-1|0}if(g>>>0>(f+(c[a+10360>>2]|0)|0)>>>0){return-1|0}a=cD(e+6|0,h,1)|0;if((a|0)==0){return-1|0}else{return((c1(b,e,a,0)|0)==0)<<31>>31|0}return 0}function dg(a,b,e,f){a=a|0;b=b|0;e=e|0;f=f|0;var g=0,h=0;if((d[e+1|0]|0)>>>0>=(c[b+44>>2]|0)>>>0){return-1|0}if(((c[b+36>>2]|0)-5|0)>>>0>=2){return-1|0}g=e+6|0;h=(aG((d[g]|d[g+1|0]<<8)<<16>>16|0)|0)&65535;g=(c[f>>2]|0)+h|0;c[f>>2]=g;f=c[a+10356>>2]|0;if(g>>>0<f>>>0){return-1|0}if(g>>>0>(f+(c[a+10360>>2]|0)|0)>>>0){return-1|0}a=cD(e+8|0,h,0)|0;if((a|0)==0){return-1|0}else{return((c1(b,e,a,0)|0)==0)<<31>>31|0}return 0}function dh(a,e,f,g){a=a|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0;if((d[f+1|0]|0)>>>0>=(c[e+44>>2]|0)>>>0){h=-1;return h|0}if(((c[e+36>>2]|0)-5|0)>>>0>=2){h=-1;return h|0}i=f+6|0;j=(aG((d[i]|d[i+1|0]<<8)<<16>>16|0)|0)&65535;i=(c[g>>2]|0)+j|0;c[g>>2]=i;g=c[a+10356>>2]|0;if(i>>>0<g>>>0){h=-1;return h|0}if(i>>>0>(g+(c[a+10360>>2]|0)|0)>>>0){h=-1;return h|0}a=f+4|0;g=aG((d[a]|d[a+1|0]<<8)<<16>>16|0)|0;a=g&65535;i=a&1023;k=e+244|0;l=b[k>>1]|0;m=(g&65535)<(l&65535)?a|65536:a;g=l&65535;if(m>>>0>=(g+32768|0)>>>0){h=0;return h|0}l=(m&65535)-i|0;do{if((l|0)==(g|0)){if((c[e+248+(i>>>5<<2)>>2]&1<<(a&31)|0)==0){break}else{h=0}return h|0}else{b[k>>1]=l&65535;eN(e+248|0,0,128)}}while(0);l=cD(f+8|0,j,2)|0;if((l|0)==0){h=-1;return h|0}if((c1(e,f,l,0)|0)==0){h=-1;return h|0}l=e+248+(i>>>5<<2)|0;c[l>>2]=c[l>>2]|1<<(a&31);h=0;return h|0}function di(f,g,h,j){f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;k=i;i=i+48|0;l=k|0;m=h+1|0;if((d[m]|0)>>>0>=(c[g+44>>2]|0)>>>0){n=-1;i=k;return n|0}if(((c[g+36>>2]|0)-5|0)>>>0>=2){n=-1;i=k;return n|0}o=h+6|0;p=(aG((d[o]|d[o+1|0]<<8)<<16>>16|0)|0)&65535;o=(c[j>>2]|0)+p|0;c[j>>2]=o;j=c[f+10356>>2]|0;if(o>>>0<j>>>0){n=-1;i=k;return n|0}if(o>>>0>(j+(c[f+10360>>2]|0)|0)>>>0){n=-1;i=k;return n|0}f=d[m]|0;m=c[g+40>>2]|0;j=m+(f*60|0)|0;o=h+4|0;q=aG((d[o]|d[o+1|0]<<8)<<16>>16|0)|0;o=(q&65535)>>>12;r=m+(f*60|0)+38|0;s=b[r>>1]|0;t=(s&65535)>>>12;u=(q&65535)<(s&65535)?o|16:o;if((u&65535)<(t&65535)){n=0;i=k;return n|0}if((u&65535)>>>0>=((t&65535)+7|0)>>>0){n=0;i=k;return n|0}t=h+12|0;u=as(d[t]|d[t+1|0]<<8|d[t+2|0]<<16|d[t+3|0]<<24|0)|0;t=h+8|0;o=as(d[t]|d[t+1|0]<<8|d[t+2|0]<<16|d[t+3|0]<<24|0)|0;t=h+20|0;s=as(d[t]|d[t+1|0]<<8|d[t+2|0]<<16|d[t+3|0]<<24|0)|0;t=h+16|0;v=as(d[t]|d[t+1|0]<<8|d[t+2|0]<<16|d[t+3|0]<<24|0)|0;if(u>>>0>=o>>>0|o>>>0>1048576|v>>>0>1073741824|s>>>0>=v>>>0|p>>>0>(v-s|0)>>>0){n=-1;i=k;return n|0}t=m+(f*60|0)+44|0;w=c[m+(f*60|0)+48>>2]|0;L1383:do{if((w|0)==(t|0)){y=1062}else{f=b[r>>1]|0;m=(q&65535)<(f&65535);z=w;while(1){A=z;B=z+8|0;C=(e[B>>1]|0)<(f&65535);if(m){if(C){y=1055}else{y=1062;break L1383}}else{if(!C){y=1055}}if((y|0)==1055){y=0;D=b[B>>1]|0;if((D&65535)<=(q&65535)){break}}B=c[z+4>>2]|0;if((B|0)==(t|0)){y=1062;break L1383}else{z=B}}if((D&65535)<(q&65535)){y=1062;break}if((a[z+12|0]&15)!=8){n=-1;i=k;return n|0}if((v|0)!=(c[(c[z+72>>2]|0)+12>>2]|0)){n=-1;i=k;return n|0}if((o|0)==(c[z+60>>2]|0)){if((z|0)==0){y=1062;break}else{E=A;break}}else{n=-1;i=k;return n|0}}}while(0);do{if((y|0)==1062){A=l|0;D=h|0;eO(A|0,D|0,48)|0;D=cD(0,v,1)|0;if((D|0)==0){n=-1;i=k;return n|0}A=l+2|0;x=q;a[A]=x&255;x=x>>8;a[A+1|0]=x&255;A=c1(g,l,D,o)|0;if((A|0)==0){n=-1}else{E=A;break}i=k;return n|0}}while(0);o=u>>>5;l=E+68|0;q=1<<(u&31);if((c[(c[l>>2]|0)+(o<<2)>>2]&q|0)!=0){n=0;i=k;return n|0}u=E+64|0;c[u>>2]=(c[u>>2]|0)-1;v=(c[l>>2]|0)+(o<<2)|0;c[v>>2]=c[v>>2]|q;q=c[E+72>>2]|0;E=c[q+12>>2]|0;v=(s+p|0)>>>0>E>>>0?E-s|0:p;p=(c[q+8>>2]|0)+s|0;s=h+24|0;eO(p|0,s|0,v)|0;if((c[u>>2]|0)!=0){n=0;i=k;return n|0}c0(g,j);n=0;i=k;return n|0}function dj(a,b,e){a=a|0;b=b|0;e=e|0;var f=0,g=0,h=0,i=0;if(((c[b+36>>2]|0)-5|0)>>>0>=2){f=-1;return f|0}g=e+4|0;h=b+48|0;c[h>>2]=as(d[g]|d[g+1|0]<<8|d[g+2|0]<<16|d[g+3|0]<<24|0)|0;g=e+8|0;c[b+52>>2]=as(d[g]|d[g+1|0]<<8|d[g+2|0]<<16|d[g+3|0]<<24|0)|0;do{if((c[h>>2]|0)==0){if((c[a+16>>2]|0)!=0){i=1087;break}c[b+180>>2]=32768}else{i=1087}}while(0);if((i|0)==1087){i=c[h>>2]|0;h=c[a+16>>2]|0;c[b+180>>2]=(i>>>0<h>>>0?i:h)>>>16<<12}h=b+180|0;b=c[h>>2]|0;if(b>>>0<4096){c[h>>2]=4096;f=0;return f|0}if(b>>>0<=32768){f=0;return f|0}c[h>>2]=32768;f=0;return f|0}function dk(a,b){a=a|0;b=b|0;var e=0,f=0;if(((c[a+36>>2]|0)-5|0)>>>0>=2){e=-1;return e|0}f=b+4|0;c[a+132>>2]=as(d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24|0)|0;f=b+8|0;c[a+124>>2]=as(d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24|0)|0;f=b+12|0;c[a+128>>2]=as(d[f]|d[f+1|0]<<8|d[f+2|0]<<16|d[f+3|0]<<24|0)|0;e=0;return e|0}function dl(f,g,h,i){f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;j=h+1|0;if((d[j]|0)>>>0>=(c[g+44>>2]|0)>>>0){k=-1;return k|0}if(((c[g+36>>2]|0)-5|0)>>>0>=2){k=-1;return k|0}l=h+6|0;m=(aG((d[l]|d[l+1|0]<<8)<<16>>16|0)|0)&65535;l=(c[i>>2]|0)+m|0;c[i>>2]=l;i=c[f+10356>>2]|0;if(l>>>0<i>>>0){k=-1;return k|0}if(l>>>0>(i+(c[f+10360>>2]|0)|0)>>>0){k=-1;return k|0}f=d[j]|0;j=c[g+40>>2]|0;i=j+(f*60|0)|0;l=h+2|0;n=(d[l]|d[l+1|0]<<8)<<16>>16;l=h+4|0;o=aG((d[l]|d[l+1|0]<<8)<<16>>16|0)|0;l=(n&65535)>>>12;p=j+(f*60|0)+38|0;q=b[p>>1]|0;r=(q&65535)>>>12;s=(n&65535)<(q&65535)?l|16:l;if((s&65535)<(r&65535)){k=0;return k|0}if((s&65535)>>>0>=((r&65535)+7|0)>>>0){k=0;return k|0}do{if(n<<16>>16==q<<16>>16){if((o&65535)>(e[j+(f*60|0)+40>>1]|0)){break}else{k=0}return k|0}}while(0);q=h+12|0;r=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=h+8|0;s=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=h+20|0;l=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;q=h+16|0;t=as(d[q]|d[q+1|0]<<8|d[q+2|0]<<16|d[q+3|0]<<24|0)|0;if(r>>>0>=s>>>0|s>>>0>1048576|t>>>0>1073741824|l>>>0>=t>>>0|m>>>0>(t-l|0)>>>0){k=-1;return k|0}q=j+(f*60|0)+52|0;u=c[j+(f*60|0)+56>>2]|0;L1467:do{if((u|0)==(q|0)){v=1125}else{f=b[p>>1]|0;j=(n&65535)<(f&65535);w=u;L1469:while(1){x=w;y=w+8|0;z=(e[y>>1]|0)<(f&65535);if(j){if(z){v=1116}else{v=1125;break L1467}}else{if(!z){v=1116}}do{if((v|0)==1116){v=0;z=b[y>>1]|0;if((z&65535)<(n&65535)){v=1125;break L1467}if((z&65535)>(n&65535)){break}A=b[x+10>>1]|0;if((A&65535)<=(o&65535)){break L1469}}}while(0);y=c[w+4>>2]|0;if((y|0)==(q|0)){v=1125;break L1467}else{w=y}}if((A&65535)<(o&65535)){v=1125;break}if((a[w+12|0]&15)!=12){k=-1;return k|0}if((t|0)!=(c[(c[w+72>>2]|0)+12>>2]|0)){k=-1;return k|0}if((s|0)==(c[w+60>>2]|0)){if((w|0)==0){v=1125;break}else{B=x;break}}else{k=-1;return k|0}}}while(0);do{if((v|0)==1125){x=cD(0,t,8)|0;if((x|0)==0){k=-1;return k|0}o=c1(g,h,x,s)|0;if((o|0)==0){k=-1}else{B=o;break}return k|0}}while(0);s=r>>>5;t=B+68|0;v=1<<(r&31);if((c[(c[t>>2]|0)+(s<<2)>>2]&v|0)!=0){k=0;return k|0}r=B+64|0;c[r>>2]=(c[r>>2]|0)-1;o=(c[t>>2]|0)+(s<<2)|0;c[o>>2]=c[o>>2]|v;v=c[B+72>>2]|0;B=c[v+12>>2]|0;o=(l+m|0)>>>0>B>>>0?B-l|0:m;m=(c[v+8>>2]|0)+l|0;l=h+24|0;eO(m|0,l|0,o)|0;if((c[r>>2]|0)!=0){k=0;return k|0}c_(g,i);k=0;return k|0}function dm(a,b,d){a=a|0;b=b|0;d=d|0;c[b+36>>2]=d;d=b+240|0;if((c[d>>2]|0)!=0){return}cz(a+52|0,b)|0;c[d>>2]=1;return}function dn(d,f,g){d=d|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;h=d+200|0;i=h|0;j=c[i>>2]|0;L1510:do{if((j|0)==(h|0)){k=1157}else{l=j;while(1){if((b[l+8>>1]|0)==f<<16>>16){if((a[l+33|0]|0)==g<<24>>24){break}}m=c[l>>2]|0;if((m|0)==(h|0)){k=1157;break L1510}else{l=m}}n=l;o=1}}while(0);L1517:do{if((k|0)==1157){j=d+216|0;m=c[j>>2]|0;if((m|0)==(j|0)){p=0;return p|0}else{q=m}while(1){m=q;if((b[m+30>>1]|0)==0){p=0;k=1175;break}if((b[q+8>>1]|0)==f<<16>>16){if((a[q+33|0]|0)==g<<24>>24){n=m;o=0;break L1517}}m=c[q>>2]|0;if((m|0)==(j|0)){p=0;k=1176;break}else{q=m}}if((k|0)==1175){return p|0}else if((k|0)==1176){return p|0}}}while(0);if((n|0)==0){p=0;return p|0}k=g&255;do{if(k>>>0<(c[d+44>>2]|0)>>>0){g=c[d+40>>2]|0;q=(f&65535)>>>12&65535;j=g+(k*60|0)+6+(q<<1)|0;l=b[j>>1]|0;if(l<<16>>16==0){break}m=l-1&65535;b[j>>1]=m;if(m<<16>>16!=0){break}m=g+(k*60|0)+4|0;b[m>>1]=e[m>>1]&(1<<q^65535)&65535}}while(0);k=a[n+32|0]&15;cA(n|0)|0;f=n+80|0;do{if((c[f>>2]|0)!=0){if((o|0)!=0){q=d+184|0;c[q>>2]=(c[q>>2]|0)-(e[n+28>>1]|0)}q=c[f>>2]|0;c[q>>2]=(c[q>>2]|0)-1;q=c[f>>2]|0;if((c[q>>2]|0)!=0){break}m=q+4|0;c[m>>2]=c[m>>2]|256;cE(c[f>>2]|0)}}while(0);ci(n);n=c[i>>2]|0;if((n|0)==(h|0)){p=k;return p|0}c[d+80>>2]=(c[n+16>>2]|0)+(c[n+12>>2]|0);p=k;return p|0}function dp(a,b,d){a=a|0;b=b|0;d=d|0;var e=0;c[a+32>>2]=1;e=b+36|0;if((d|0)==0){dm(a,b,(c[e>>2]|0)==1?4:3);return}else{c[e>>2]=5;c[d>>2]=1;c[d+4>>2]=b;c[d+12>>2]=c[b+376>>2];return}}function dq(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=b+36|0;if((c[e>>2]|0)>>>0>2){c[a+32>>2]=1}f=c[e>>2]|0;if((f|0)!=1&f>>>0<4){cS(b);return}if((d|0)==0){c[b+376>>2]=0;dm(a,b,9);return}else{c[d>>2]=2;c[d+4>>2]=b;c[d+12>>2]=0;cS(b);return}}function dr(b,e){b=b|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;f=b+1608|0;g=b+70|0;h=b+70+((c[f>>2]|0)*48|0)|0;i=b+2132|0;j=b+1612|0;k=b+1612+(c[i>>2]<<3)|0;l=e+192|0;m=c[l>>2]|0;if((m|0)==(l|0)){n=k;o=h;p=o;q=g;r=p-q|0;s=(r|0)/48|0;c[f>>2]=s;t=n;u=j;v=t-u|0;w=v>>3;c[i>>2]=w;return}y=b+1606|0;z=b+2132|0;A=e+176|0;B=b+64|0;C=k;k=m;m=h;while(1){if(!(m>>>0<y>>>0&C>>>0<z>>>0)){break}if(((c[A>>2]|0)-(c[B>>2]|0)|0)>>>0<8){break}h=c[k>>2]|0;D=m|0;c[C>>2]=D;c[C+4>>2]=8;c[B>>2]=(c[B>>2]|0)+8;E=k+12|0;F=E;G=F+2|0;H=aG((d[G]|d[G+1|0]<<8)<<16>>16|0)|0;a[D]=1;a[m+1|0]=a[F+1|0]|0;F=m+2|0;x=H;a[F]=x&255;x=x>>8;a[F+1|0]=x&255;F=m+4|0;x=H;a[F]=x&255;x=x>>8;a[F+1|0]=x&255;F=m+6|0;x=aG(c[k+8>>2]&65535|0)|0;a[F]=x&255;x=x>>8;a[F+1|0]=x&255;if((a[E]&15)==4){dm(b,e,9)}cA(k)|0;ci(k);E=m+48|0;F=C+8|0;if((h|0)==(l|0)){n=F;o=E;I=1208;break}else{C=F;k=h;m=E}}if((I|0)==1208){p=o;q=g;r=p-q|0;s=(r|0)/48|0;c[f>>2]=s;t=n;u=j;v=t-u|0;w=v>>3;c[i>>2]=w;return}c[b+60>>2]=1;n=C;o=m;p=o;q=g;r=p-q|0;s=(r|0)/48|0;c[f>>2]=s;t=n;u=j;v=t-u|0;w=v>>3;c[i>>2]=w;return}function ds(a,b,d){a=a|0;b=b|0;d=d|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;f=b+200|0;g=f|0;h=c[g>>2]|0;i=c[b+216>>2]|0;if((h|0)==(f|0)){j=0;return j|0}k=a+48|0;l=b+84|0;m=b+96|0;n=b+80|0;o=b+184|0;p=b+148|0;q=b+144|0;r=h;L1588:while(1){h=c[r>>2]|0;s=c[k>>2]|0;t=r+12|0;u=c[t>>2]|0;v=s-u|0;w=r+16|0;x=w;do{if((v>>>0>86399999?u-s|0:v)>>>0>=(c[x>>2]|0)>>>0){y=c[l>>2]|0;do{if((y|0)==0){z=1216}else{if((u-y|0)>>>0>86399999){z=1216;break}A=c[l>>2]|0}}while(0);if((z|0)==1216){z=0;y=c[t>>2]|0;c[l>>2]=y;A=y}do{if((A|0)!=0){y=c[k>>2]|0;B=y-A|0;C=B>>>0>86399999?A-y|0:B;if(C>>>0>=(c[p>>2]|0)>>>0){break L1588}if((c[x>>2]|0)>>>0<(c[r+20>>2]|0)>>>0){break}if(C>>>0>=(c[q>>2]|0)>>>0){break L1588}}}while(0);if((c[r+80>>2]|0)!=0){c[o>>2]=(c[o>>2]|0)-(e[r+28>>1]|0)}c[m>>2]=(c[m>>2]|0)+1;c[w>>2]=c[x>>2]<<1;C=cA(r)|0;cz(i,C)|0;C=c[g>>2]|0;if((h|0)!=(C|0)|(C|0)==(f|0)){break}c[n>>2]=(c[h+16>>2]|0)+(c[h+12>>2]|0)}}while(0);if((h|0)==(f|0)){j=0;z=1229;break}else{r=h}}if((z|0)==1229){return j|0}dq(a,b,d);j=1;return j|0}function dt(f,g){f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0;h=f+1608|0;i=f+70|0;j=f+70+((c[h>>2]|0)*48|0)|0;k=f+2132|0;l=f+1612|0;m=f+1612+(c[k>>2]<<3)|0;n=g+216|0;o=c[n>>2]|0;if((o|0)==(n|0)){p=1;q=m;r=j;s=r;t=i;u=s-t|0;v=(u|0)/48|0;c[h>>2]=v;w=q;x=l;y=w-x|0;z=y>>3;c[k>>2]=z;return p|0}A=g+44|0;B=g+40|0;C=g+108|0;D=g+180|0;E=g+184|0;F=g+176|0;G=f+1606|0;H=f+2132|0;I=g+176|0;J=f+64|0;K=g+168|0;L=g+172|0;M=g+140|0;N=g+200|0;O=N|0;P=f+48|0;Q=g+80|0;R=f+48|0;S=f+68|0;T=g+92|0;U=g+184|0;g=o;o=m;m=0;V=0;W=1;X=j;L1616:while(1){j=c[A>>2]|0;Y=g;Z=m;_=V;while(1){$=Y;aa=_;L1620:while(1){ac=$;ad=$+32|0;ae=d[ad+1|0]|0;if(ae>>>0>=j>>>0){af=1236;break}ag=c[B>>2]|0;ah=ag+(ae*60|0)|0;ai=b[$+8>>1]|0;aj=(ai&65535)>>>12;ak=(ah|0)!=0;if(!ak){al=aa;am=0;an=aj;ao=0;break}do{if((aa|0)==0){if((b[ac+30>>1]|0)!=0){al=0;am=ah;an=aj;ao=ak;break L1620}if((ai&4095)!=0){al=0;am=ah;an=aj;ao=ak;break L1620}ap=aj&65535;if((e[ag+(ae*60|0)+6+((((ap|16)-1|0)%16|0)<<1)>>1]|0)>4095){aq=1;break}if((e[ag+(ae*60|0)+4>>1]&(255>>>((4096-ap|0)>>>0)|255<<ap)|0)!=0){aq=1;break}if((aa|0)==0){al=0;am=ah;an=aj;ao=ak;break L1620}else{aq=aa}}else{aq=aa}}while(0);ak=c[$>>2]|0;if((ak|0)==(n|0)){p=W;q=o;r=X;af=1268;break L1616}else{$=ak;aa=aq}}if((af|0)==1236){af=0;al=aa;am=0;an=(e[$+8>>1]|0)>>>12;ao=0}ar=$+80|0;if((c[ar>>2]|0)==0){as=Z;break}if((Z|0)==0){ak=(ab(c[D>>2]|0,c[C>>2]|0)|0)>>>5;aj=c[F>>2]|0;ah=((e[$+28>>1]|0)+(c[E>>2]|0)|0)>>>0>(ak>>>0>aj>>>0?ak:aj)>>>0?1:Z;if((ah|0)==0){as=0;break}else{at=ah}}else{at=Z}ah=c[$>>2]|0;if((ah|0)==(n|0)){p=W;q=o;r=X;af=1270;break L1616}else{Y=ah;Z=at;_=al}}_=ad;Z=c[312+((a[_]&15)<<2)>>2]|0;if(X>>>0>=G>>>0){af=1254;break}Y=o+8|0;if(Y>>>0>=H>>>0){af=1254;break}j=(c[I>>2]|0)-(c[J>>2]|0)|0;if(j>>>0<Z>>>0){af=1254;break}if((c[ar>>2]|0)!=0){if((j&65535)>>>0<((e[$+28>>1]|0)+Z&65535)>>>0){af=1254;break}}j=c[$>>2]|0;do{if(ao){if((b[ac+30>>1]|0)!=0){break}ah=an&65535;aj=am+4|0;b[aj>>1]=(e[aj>>1]|1<<ah)&65535;aj=am+6+(ah<<1)|0;b[aj>>1]=(b[aj>>1]|0)+1&65535}}while(0);aj=ac+30|0;b[aj>>1]=(b[aj>>1]|0)+1&65535;aj=$+16|0;ah=aj;if((c[ah>>2]|0)==0){ak=(c[L>>2]<<2)+(c[K>>2]|0)|0;c[aj>>2]=ak;c[$+20>>2]=ab(ak,c[M>>2]|0)|0}if((c[O>>2]|0)==(N|0)){c[Q>>2]=(c[ah>>2]|0)+(c[P>>2]|0)}cz(N,cA($)|0)|0;c[$+12>>2]=c[R>>2];ah=X|0;c[o>>2]=ah;c[o+4>>2]=Z;c[J>>2]=(c[J>>2]|0)+Z;b[S>>1]=b[S>>1]|-32768;eO(ah|0,_|0,48)|0;ah=c[ar>>2]|0;if((ah|0)==0){au=o}else{c[Y>>2]=(c[ah+8>>2]|0)+(c[$+24>>2]|0);ah=$+28|0;c[o+12>>2]=e[ah>>1]|0;c[J>>2]=(c[J>>2]|0)+(e[ah>>1]|0);c[U>>2]=(c[U>>2]|0)+(e[ah>>1]|0);au=Y}c[T>>2]=(c[T>>2]|0)+1;ah=X+48|0;ak=au+8|0;if((j|0)==(n|0)){p=0;q=ak;r=ah;af=1267;break}else{g=j;o=ak;m=as;V=al;W=0;X=ah}}if((af|0)==1254){c[f+60>>2]=1;p=0;q=o;r=X;s=r;t=i;u=s-t|0;v=(u|0)/48|0;c[h>>2]=v;w=q;x=l;y=w-x|0;z=y>>3;c[k>>2]=z;return p|0}else if((af|0)==1267){s=r;t=i;u=s-t|0;v=(u|0)/48|0;c[h>>2]=v;w=q;x=l;y=w-x|0;z=y>>3;c[k>>2]=z;return p|0}else if((af|0)==1268){s=r;t=i;u=s-t|0;v=(u|0)/48|0;c[h>>2]=v;w=q;x=l;y=w-x|0;z=y>>3;c[k>>2]=z;return p|0}else if((af|0)==1270){s=r;t=i;u=s-t|0;v=(u|0)/48|0;c[h>>2]=v;w=q;x=l;y=w-x|0;z=y>>3;c[k>>2]=z;return p|0}return 0}function du(d,f){d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;g=d+1608|0;h=d+70|0;i=d+70+((c[g>>2]|0)*48|0)|0;j=d+2132|0;k=d+1612|0;l=d+1612+(c[j>>2]<<3)|0;m=f+224|0;n=m|0;o=c[n>>2]|0;L1665:do{if((o|0)==(m|0)){p=l;q=i}else{r=d+1606|0;s=d+2132|0;t=f+176|0;u=d+64|0;v=f+116|0;w=f+108|0;x=f+208|0;y=o;z=l;A=i;L1667:while(1){B=z+8|0;C=B>>>0<s>>>0;if(A>>>0<r>>>0){D=y}else{break}while(1){E=D;F=D+32|0;G=c[312+((a[F]&15)<<2)>>2]|0;if(!C){break L1667}H=(c[t>>2]|0)-(c[u>>2]|0)|0;if(H>>>0<G>>>0){break L1667}I=D+80|0;if((c[I>>2]|0)==0){J=1278;break}if(H>>>0<((e[D+28>>1]|0)+G|0)>>>0){break L1667}H=c[D>>2]|0;if((c[I>>2]|0)==0){K=H;break}if((c[D+24>>2]|0)!=0){K=H;break}L=(c[v>>2]|0)+7&31;c[v>>2]=L;if(L>>>0<=(c[w>>2]|0)>>>0){K=H;break}L=b[D+8>>1]|0;M=b[E+10>>1]|0;N=E;E=H;while(1){H=N+80|0;O=c[H>>2]|0;c[O>>2]=(c[O>>2]|0)-1;O=c[H>>2]|0;if((c[O>>2]|0)==0){cE(O)}cA(N|0)|0;ci(N);if((E|0)==(m|0)){break}O=E;if((b[E+8>>1]|0)!=L<<16>>16){break}if((b[O+10>>1]|0)!=M<<16>>16){break}N=O;E=c[E>>2]|0}if((E|0)==(m|0)){p=z;q=A;break L1665}else{D=E}}if((J|0)==1278){J=0;K=c[D>>2]|0}C=A|0;c[z>>2]=C;c[z+4>>2]=G;c[u>>2]=(c[u>>2]|0)+G;eO(C|0,F|0,48)|0;cA(D)|0;C=c[I>>2]|0;if((C|0)==0){ci(D);P=z}else{c[B>>2]=(c[C+8>>2]|0)+(c[D+24>>2]|0);C=e[D+28>>1]|0;c[z+12>>2]=C;c[u>>2]=(c[u>>2]|0)+C;C=D;cz(x,C)|0;P=B}C=A+48|0;N=P+8|0;if((K|0)==(m|0)){p=N;q=C;break L1665}else{y=K;z=N;A=C}}c[d+60>>2]=1;p=z;q=A}}while(0);c[g>>2]=(q-h|0)/48|0;c[j>>2]=p-k>>3;if((c[f+36>>2]|0)!=6){return}k=f+216|0;if((c[k>>2]|0)!=(k|0)){return}if((c[n>>2]|0)!=(m|0)){return}m=f+200|0;if((c[m>>2]|0)!=(m|0)){return}cX(f,c[f+376>>2]|0);return}function dv(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0;b=a+208|0;a=b|0;d=c[a>>2]|0;if((d|0)==(b|0)){return}else{e=d}do{cA(e)|0;d=e+80|0;f=c[d>>2]|0;do{if((f|0)!=0){g=f|0;c[g>>2]=(c[g>>2]|0)-1;g=c[d>>2]|0;if((c[g>>2]|0)!=0){break}h=g+4|0;c[h>>2]=c[h>>2]|256;cE(c[d>>2]|0)}}while(0);ci(e);e=c[a>>2]|0;}while((e|0)!=(b|0));return}function dw(){return 0}function dx(){return}function dy(){var a=0,b=0;a=i;i=i+8|0;b=a|0;a6(b|0,0)|0;i=a;return((c[b+4>>2]|0)/1e3|0)+((c[b>>2]|0)*1e3|0)-(c[230]|0)|0}function dz(a){a=a|0;var b=0,d=0;b=i;i=i+8|0;d=b|0;a6(d|0,0)|0;c[230]=((c[d>>2]|0)*1e3|0)-a+((c[d+4>>2]|0)/1e3|0);i=b;return}function dA(a,b){a=a|0;b=b|0;var d=0,e=0;d=a5(b|0)|0;do{if((d|0)!=0){if((c[d+8>>2]|0)!=2){break}c[a>>2]=c[c[c[d+16>>2]>>2]>>2];e=0;return e|0}}while(0);e=((aW(b|0,a|0)|0)==0)<<31>>31;return e|0}function dB(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=ba(a|0)|0;if((d|0)==0){e=-1;return e|0}eQ(b|0,d|0,c|0)|0;e=0;return e|0}function dC(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+8|0;f=e|0;c[f>>2]=c[a>>2];g=aX(f|0,4,2)|0;if((g|0)==0){h=dB(a,b,d)|0;i=e;return h|0}else{a=c[g>>2]|0;eQ(b|0,a|0,d|0)|0;h=0;i=e;return h|0}return 0}function dD(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0;e=i;i=i+16|0;f=e|0;eN(f|0,0,16);b[f>>1]=2;if((d|0)==0){b[f+2>>1]=0;c[f+4>>2]=0;g=f;h=bj(a|0,g|0,16)|0;i=e;return h|0}else{b[f+2>>1]=aG(b[d+4>>1]|0)|0;c[f+4>>2]=c[d>>2];g=f;h=bj(a|0,g|0,16)|0;i=e;return h|0}return 0}function dE(a,b){a=a|0;b=b|0;return aY(a|0,((b|0)<0?128:b)|0)|0}function dF(a){a=a|0;return bg(2,((a|0)==2?2:1)|0,0)|0}function dG(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+8|0;f=e|0;c[f>>2]=d;switch(b|0){case 6:{g=a_(a|0,1,20,f|0,4)|0;break};case 7:{g=a_(a|0,1,21,f|0,4)|0;break};case 2:{g=a_(a|0,1,6,f|0,4)|0;break};case 3:{g=a_(a|0,1,8,f|0,4)|0;break};case 5:{g=a_(a|0,1,2,f|0,4)|0;break};case 4:{g=a_(a|0,1,7,f|0,4)|0;break};default:{g=-1}}i=e;return((g|0)==-1)<<31>>31|0}function dH(a,d){a=a|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e|0;eN(f|0,0,16);b[f>>1]=2;b[f+2>>1]=aG(b[d+4>>1]|0)|0;c[f+4>>2]=c[d>>2];d=aB(a|0,f|0,16)|0;do{if((d|0)==-1){if((c[(bk()|0)>>2]|0)==115){g=0}else{break}i=e;return g|0}}while(0);g=d;i=e;return g|0}function dI(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,k=0;e=i;i=i+24|0;f=e|0;g=e+16|0;c[g>>2]=16;h=(d|0)!=0;if(h){j=f}else{j=0}k=ax(a|0,j|0,(h?g:0)|0)|0;if((k|0)==-1|h^1){i=e;return k|0}c[d>>2]=c[f+4>>2];b[d+4>>1]=aG(b[f+2>>1]|0)|0;i=e;return k|0}function dJ(a,b){a=a|0;b=b|0;return aC(a|0,b|0)|0}function dK(a){a=a|0;if((a|0)==-1){return}aD(a|0)|0;return}function dL(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+48|0;h=g|0;j=g+32|0;eN(h|0,0,28);if((d|0)!=0){k=j;eN(k|0,0,16);b[j>>1]=2;b[j+2>>1]=aG(b[d+4>>1]|0)|0;c[j+4>>2]=c[d>>2];c[h>>2]=k;c[h+4>>2]=16}c[h+8>>2]=e;c[h+12>>2]=f;f=bs(a|0,h|0,16384)|0;if((f|0)!=-1){l=f;i=g;return l|0}l=((c[(bk()|0)>>2]|0)!=11)<<31>>31;i=g;return l|0}function dM(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0;g=i;i=i+48|0;h=g|0;j=g+32|0;eN(h|0,0,28);k=(d|0)!=0;if(k){c[h>>2]=j;c[h+4>>2]=16}c[h+8>>2]=e;c[h+12>>2]=f;f=aS(a|0,h|0,16384)|0;if((f|0)==-1){l=((c[(bk()|0)>>2]|0)!=11)<<31>>31;i=g;return l|0}if(!k){l=f;i=g;return l|0}c[d>>2]=c[j+4>>2];b[d+4>>1]=aG(b[j+2>>1]|0)|0;l=f;i=g;return l|0}function dN(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0;f=i;i=i+8|0;g=f|0;c[g>>2]=(e>>>0)/1e3|0;c[g+4>>2]=((e>>>0)%1e3|0)*1e3|0;e=aT(a+1|0,b|0,d|0,0,g|0)|0;i=f;return e|0}function dO(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=i;i=i+128|0;f=e|0;g=i;i=i+128|0;h=i;i=i+8|0;c[h>>2]=(d>>>0)/1e3|0;c[h+4>>2]=((d>>>0)%1e3|0)*1e3|0;eN(f|0,0,128);eN(g|0,0,128);if((c[b>>2]&1|0)!=0){d=g+(a>>>5<<2)|0;c[d>>2]=c[d>>2]|1<<(a&31)}if((c[b>>2]&2|0)!=0){d=f+(a>>>5<<2)|0;c[d>>2]=c[d>>2]|1<<(a&31)}d=aT(a+1|0,f|0,g|0,0,h|0)|0;if((d|0)<0){j=-1;i=e;return j|0}c[b>>2]=0;if((d|0)==0){j=0;i=e;return j|0}d=a>>>5;h=1<<(a&31);if((c[g+(d<<2)>>2]&h|0)!=0){c[b>>2]=1}if((c[f+(d<<2)>>2]&h|0)==0){j=0;i=e;return j|0}c[b>>2]=c[b>>2]|2;j=0;i=e;return j|0}function dP(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,aq=0,ar=0,as=0,au=0,av=0,aw=0,ax=0,ay=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0,aI=0;do{if(a>>>0<245){if(a>>>0<11){b=16}else{b=a+11&-8}d=b>>>3;e=c[522]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=2128+(h<<2)|0;j=2128+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[522]=e&~(1<<g)}else{if(l>>>0<(c[526]|0)>>>0){az();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{az();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(b>>>0<=(c[524]|0)>>>0){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=2128+(p<<2)|0;m=2128+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[522]=e&~(1<<r)}else{if(l>>>0<(c[526]|0)>>>0){az();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{az();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[524]|0;if((l|0)!=0){q=c[527]|0;d=l>>>3;l=d<<1;f=2128+(l<<2)|0;k=c[522]|0;h=1<<d;do{if((k&h|0)==0){c[522]=k|h;s=f;t=2128+(l+2<<2)|0}else{d=2128+(l+2<<2)|0;g=c[d>>2]|0;if(g>>>0>=(c[526]|0)>>>0){s=g;t=d;break}az();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[524]=m;c[527]=e;n=i;return n|0}l=c[523]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[2392+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[526]|0;if(r>>>0<i>>>0){az();return 0}e=r+b|0;m=e;if(r>>>0>=e>>>0){az();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){az();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){az();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){az();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{az();return 0}}}while(0);L1897:do{if((e|0)!=0){f=d+28|0;i=2392+(c[f>>2]<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[523]=c[523]&~(1<<c[f>>2]);break L1897}else{if(e>>>0<(c[526]|0)>>>0){az();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break L1897}}}while(0);if(v>>>0<(c[526]|0)>>>0){az();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[526]|0)>>>0){az();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[526]|0)>>>0){az();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[524]|0;if((f|0)!=0){e=c[527]|0;i=f>>>3;f=i<<1;q=2128+(f<<2)|0;k=c[522]|0;g=1<<i;do{if((k&g|0)==0){c[522]=k|g;y=q;z=2128+(f+2<<2)|0}else{i=2128+(f+2<<2)|0;l=c[i>>2]|0;if(l>>>0>=(c[526]|0)>>>0){y=l;z=i;break}az();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[524]=p;c[527]=m}f=d+8|0;if((f|0)==0){o=b;break}else{n=f}return n|0}else{if(a>>>0>4294967231){o=-1;break}f=a+11|0;g=f&-8;k=c[523]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[2392+(A<<2)>>2]|0;L1945:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break L1945}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[2392+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(J>>>0>=((c[524]|0)-g|0)>>>0){o=g;break}q=K;m=c[526]|0;if(q>>>0<m>>>0){az();return 0}p=q+g|0;k=p;if(q>>>0>=p>>>0){az();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){az();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){az();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){az();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{az();return 0}}}while(0);L1995:do{if((e|0)!=0){i=K+28|0;m=2392+(c[i>>2]<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[523]=c[523]&~(1<<c[i>>2]);break L1995}else{if(e>>>0<(c[526]|0)>>>0){az();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break L1995}}}while(0);if(L>>>0<(c[526]|0)>>>0){az();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[526]|0)>>>0){az();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[526]|0)>>>0){az();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);do{if(J>>>0<16){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256){e=i<<1;m=2128+(e<<2)|0;r=c[522]|0;j=1<<i;do{if((r&j|0)==0){c[522]=r|j;O=m;P=2128+(e+2<<2)|0}else{i=2128+(e+2<<2)|0;d=c[i>>2]|0;if(d>>>0>=(c[526]|0)>>>0){O=d;P=i;break}az();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=2392+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[523]|0;l=1<<Q;if((m&l|0)==0){c[523]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}l=J<<R;m=c[j>>2]|0;while(1){if((c[m+4>>2]&-8|0)==(J|0)){break}S=m+16+(l>>>31<<2)|0;j=c[S>>2]|0;if((j|0)==0){T=1554;break}else{l=l<<1;m=j}}if((T|0)==1554){if(S>>>0<(c[526]|0)>>>0){az();return 0}else{c[S>>2]=e;c[q+(g+24)>>2]=m;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}}l=m+8|0;j=c[l>>2]|0;i=c[526]|0;if(m>>>0<i>>>0){az();return 0}if(j>>>0<i>>>0){az();return 0}else{c[j+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=j;c[q+(g+12)>>2]=m;c[q+(g+24)>>2]=0;break}}}while(0);q=K+8|0;if((q|0)==0){o=g;break}else{n=q}return n|0}}while(0);K=c[524]|0;if(o>>>0<=K>>>0){S=K-o|0;J=c[527]|0;if(S>>>0>15){R=J;c[527]=R+o;c[524]=S;c[R+(o+4)>>2]=S|1;c[R+K>>2]=S;c[J+4>>2]=o|3}else{c[524]=0;c[527]=0;c[J+4>>2]=K|3;S=J+(K+4)|0;c[S>>2]=c[S>>2]|1}n=J+8|0;return n|0}J=c[525]|0;if(o>>>0<J>>>0){S=J-o|0;c[525]=S;J=c[528]|0;K=J;c[528]=K+o;c[K+(o+4)>>2]=S|1;c[J+4>>2]=o|3;n=J+8|0;return n|0}do{if((c[236]|0)==0){J=at(30)|0;if((J-1&J|0)==0){c[238]=J;c[237]=J;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az();return 0}}}while(0);J=o+48|0;S=c[238]|0;K=o+47|0;R=S+K|0;Q=-S|0;S=R&Q;if(S>>>0<=o>>>0){n=0;return n|0}O=c[632]|0;do{if((O|0)!=0){P=c[630]|0;L=P+S|0;if(L>>>0<=P>>>0|L>>>0>O>>>0){n=0}else{break}return n|0}}while(0);L2087:do{if((c[633]&4|0)==0){O=c[528]|0;L2089:do{if((O|0)==0){T=1584}else{L=O;P=2536;while(1){U=P|0;M=c[U>>2]|0;if(M>>>0<=L>>>0){V=P+4|0;if((M+(c[V>>2]|0)|0)>>>0>L>>>0){break}}M=c[P+8>>2]|0;if((M|0)==0){T=1584;break L2089}else{P=M}}if((P|0)==0){T=1584;break}L=R-(c[525]|0)&Q;if(L>>>0>=2147483647){W=0;break}m=bh(L|0)|0;e=(m|0)==((c[U>>2]|0)+(c[V>>2]|0)|0);X=e?m:-1;Y=e?L:0;Z=m;_=L;T=1593}}while(0);do{if((T|0)==1584){O=bh(0)|0;if((O|0)==-1){W=0;break}g=O;L=c[237]|0;m=L-1|0;if((m&g|0)==0){$=S}else{$=S-g+(m+g&-L)|0}L=c[630]|0;g=L+$|0;if(!($>>>0>o>>>0&$>>>0<2147483647)){W=0;break}m=c[632]|0;if((m|0)!=0){if(g>>>0<=L>>>0|g>>>0>m>>>0){W=0;break}}m=bh($|0)|0;g=(m|0)==(O|0);X=g?O:-1;Y=g?$:0;Z=m;_=$;T=1593}}while(0);L2109:do{if((T|0)==1593){m=-_|0;if((X|0)!=-1){aa=Y;ab=X;T=1604;break L2087}do{if((Z|0)!=-1&_>>>0<2147483647&_>>>0<J>>>0){g=c[238]|0;O=K-_+g&-g;if(O>>>0>=2147483647){ac=_;break}if((bh(O|0)|0)==-1){bh(m|0)|0;W=Y;break L2109}else{ac=O+_|0;break}}else{ac=_}}while(0);if((Z|0)==-1){W=Y}else{aa=ac;ab=Z;T=1604;break L2087}}}while(0);c[633]=c[633]|4;ad=W;T=1601}else{ad=0;T=1601}}while(0);do{if((T|0)==1601){if(S>>>0>=2147483647){break}W=bh(S|0)|0;Z=bh(0)|0;if(!((Z|0)!=-1&(W|0)!=-1&W>>>0<Z>>>0)){break}ac=Z-W|0;Z=ac>>>0>(o+40|0)>>>0;Y=Z?W:-1;if((Y|0)!=-1){aa=Z?ac:ad;ab=Y;T=1604}}}while(0);do{if((T|0)==1604){ad=(c[630]|0)+aa|0;c[630]=ad;if(ad>>>0>(c[631]|0)>>>0){c[631]=ad}ad=c[528]|0;L2129:do{if((ad|0)==0){S=c[526]|0;if((S|0)==0|ab>>>0<S>>>0){c[526]=ab}c[634]=ab;c[635]=aa;c[637]=0;c[531]=c[236];c[530]=-1;S=0;do{Y=S<<1;ac=2128+(Y<<2)|0;c[2128+(Y+3<<2)>>2]=ac;c[2128+(Y+2<<2)>>2]=ac;S=S+1|0;}while(S>>>0<32);S=ab+8|0;if((S&7|0)==0){ae=0}else{ae=-S&7}S=aa-40-ae|0;c[528]=ab+ae;c[525]=S;c[ab+(ae+4)>>2]=S|1;c[ab+(aa-36)>>2]=40;c[529]=c[240]}else{S=2536;while(1){af=c[S>>2]|0;ag=S+4|0;ah=c[ag>>2]|0;if((ab|0)==(af+ah|0)){T=1616;break}ac=c[S+8>>2]|0;if((ac|0)==0){break}else{S=ac}}do{if((T|0)==1616){if((c[S+12>>2]&8|0)!=0){break}ac=ad;if(!(ac>>>0>=af>>>0&ac>>>0<ab>>>0)){break}c[ag>>2]=ah+aa;ac=c[528]|0;Y=(c[525]|0)+aa|0;Z=ac;W=ac+8|0;if((W&7|0)==0){ai=0}else{ai=-W&7}W=Y-ai|0;c[528]=Z+ai;c[525]=W;c[Z+(ai+4)>>2]=W|1;c[Z+(Y+4)>>2]=40;c[529]=c[240];break L2129}}while(0);if(ab>>>0<(c[526]|0)>>>0){c[526]=ab}S=ab+aa|0;Y=2536;while(1){aj=Y|0;if((c[aj>>2]|0)==(S|0)){T=1626;break}Z=c[Y+8>>2]|0;if((Z|0)==0){break}else{Y=Z}}do{if((T|0)==1626){if((c[Y+12>>2]&8|0)!=0){break}c[aj>>2]=ab;S=Y+4|0;c[S>>2]=(c[S>>2]|0)+aa;S=ab+8|0;if((S&7|0)==0){ak=0}else{ak=-S&7}S=ab+(aa+8)|0;if((S&7|0)==0){al=0}else{al=-S&7}S=ab+(al+aa)|0;Z=S;W=ak+o|0;ac=ab+W|0;_=ac;K=S-(ab+ak)-o|0;c[ab+(ak+4)>>2]=o|3;do{if((Z|0)==(c[528]|0)){J=(c[525]|0)+K|0;c[525]=J;c[528]=_;c[ab+(W+4)>>2]=J|1}else{if((Z|0)==(c[527]|0)){J=(c[524]|0)+K|0;c[524]=J;c[527]=_;c[ab+(W+4)>>2]=J|1;c[ab+(J+W)>>2]=J;break}J=aa+4|0;X=c[ab+(J+al)>>2]|0;if((X&3|0)==1){$=X&-8;V=X>>>3;L2174:do{if(X>>>0<256){U=c[ab+((al|8)+aa)>>2]|0;Q=c[ab+(aa+12+al)>>2]|0;R=2128+(V<<1<<2)|0;do{if((U|0)!=(R|0)){if(U>>>0<(c[526]|0)>>>0){az();return 0}if((c[U+12>>2]|0)==(Z|0)){break}az();return 0}}while(0);if((Q|0)==(U|0)){c[522]=c[522]&~(1<<V);break}do{if((Q|0)==(R|0)){am=Q+8|0}else{if(Q>>>0<(c[526]|0)>>>0){az();return 0}m=Q+8|0;if((c[m>>2]|0)==(Z|0)){am=m;break}az();return 0}}while(0);c[U+12>>2]=Q;c[am>>2]=U}else{R=S;m=c[ab+((al|24)+aa)>>2]|0;P=c[ab+(aa+12+al)>>2]|0;do{if((P|0)==(R|0)){O=al|16;g=ab+(J+O)|0;L=c[g>>2]|0;if((L|0)==0){e=ab+(O+aa)|0;O=c[e>>2]|0;if((O|0)==0){an=0;break}else{ao=O;ap=e}}else{ao=L;ap=g}while(1){g=ao+20|0;L=c[g>>2]|0;if((L|0)!=0){ao=L;ap=g;continue}g=ao+16|0;L=c[g>>2]|0;if((L|0)==0){break}else{ao=L;ap=g}}if(ap>>>0<(c[526]|0)>>>0){az();return 0}else{c[ap>>2]=0;an=ao;break}}else{g=c[ab+((al|8)+aa)>>2]|0;if(g>>>0<(c[526]|0)>>>0){az();return 0}L=g+12|0;if((c[L>>2]|0)!=(R|0)){az();return 0}e=P+8|0;if((c[e>>2]|0)==(R|0)){c[L>>2]=P;c[e>>2]=g;an=P;break}else{az();return 0}}}while(0);if((m|0)==0){break}P=ab+(aa+28+al)|0;U=2392+(c[P>>2]<<2)|0;do{if((R|0)==(c[U>>2]|0)){c[U>>2]=an;if((an|0)!=0){break}c[523]=c[523]&~(1<<c[P>>2]);break L2174}else{if(m>>>0<(c[526]|0)>>>0){az();return 0}Q=m+16|0;if((c[Q>>2]|0)==(R|0)){c[Q>>2]=an}else{c[m+20>>2]=an}if((an|0)==0){break L2174}}}while(0);if(an>>>0<(c[526]|0)>>>0){az();return 0}c[an+24>>2]=m;R=al|16;P=c[ab+(R+aa)>>2]|0;do{if((P|0)!=0){if(P>>>0<(c[526]|0)>>>0){az();return 0}else{c[an+16>>2]=P;c[P+24>>2]=an;break}}}while(0);P=c[ab+(J+R)>>2]|0;if((P|0)==0){break}if(P>>>0<(c[526]|0)>>>0){az();return 0}else{c[an+20>>2]=P;c[P+24>>2]=an;break}}}while(0);aq=ab+(($|al)+aa)|0;ar=$+K|0}else{aq=Z;ar=K}J=aq+4|0;c[J>>2]=c[J>>2]&-2;c[ab+(W+4)>>2]=ar|1;c[ab+(ar+W)>>2]=ar;J=ar>>>3;if(ar>>>0<256){V=J<<1;X=2128+(V<<2)|0;P=c[522]|0;m=1<<J;do{if((P&m|0)==0){c[522]=P|m;as=X;au=2128+(V+2<<2)|0}else{J=2128+(V+2<<2)|0;U=c[J>>2]|0;if(U>>>0>=(c[526]|0)>>>0){as=U;au=J;break}az();return 0}}while(0);c[au>>2]=_;c[as+12>>2]=_;c[ab+(W+8)>>2]=as;c[ab+(W+12)>>2]=X;break}V=ac;m=ar>>>8;do{if((m|0)==0){av=0}else{if(ar>>>0>16777215){av=31;break}P=(m+1048320|0)>>>16&8;$=m<<P;J=($+520192|0)>>>16&4;U=$<<J;$=(U+245760|0)>>>16&2;Q=14-(J|P|$)+(U<<$>>>15)|0;av=ar>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=2392+(av<<2)|0;c[ab+(W+28)>>2]=av;c[ab+(W+20)>>2]=0;c[ab+(W+16)>>2]=0;X=c[523]|0;Q=1<<av;if((X&Q|0)==0){c[523]=X|Q;c[m>>2]=V;c[ab+(W+24)>>2]=m;c[ab+(W+12)>>2]=V;c[ab+(W+8)>>2]=V;break}if((av|0)==31){aw=0}else{aw=25-(av>>>1)|0}Q=ar<<aw;X=c[m>>2]|0;while(1){if((c[X+4>>2]&-8|0)==(ar|0)){break}ax=X+16+(Q>>>31<<2)|0;m=c[ax>>2]|0;if((m|0)==0){T=1699;break}else{Q=Q<<1;X=m}}if((T|0)==1699){if(ax>>>0<(c[526]|0)>>>0){az();return 0}else{c[ax>>2]=V;c[ab+(W+24)>>2]=X;c[ab+(W+12)>>2]=V;c[ab+(W+8)>>2]=V;break}}Q=X+8|0;m=c[Q>>2]|0;$=c[526]|0;if(X>>>0<$>>>0){az();return 0}if(m>>>0<$>>>0){az();return 0}else{c[m+12>>2]=V;c[Q>>2]=V;c[ab+(W+8)>>2]=m;c[ab+(W+12)>>2]=X;c[ab+(W+24)>>2]=0;break}}}while(0);n=ab+(ak|8)|0;return n|0}}while(0);Y=ad;W=2536;while(1){ay=c[W>>2]|0;if(ay>>>0<=Y>>>0){aA=c[W+4>>2]|0;aB=ay+aA|0;if(aB>>>0>Y>>>0){break}}W=c[W+8>>2]|0}W=ay+(aA-39)|0;if((W&7|0)==0){aC=0}else{aC=-W&7}W=ay+(aA-47+aC)|0;ac=W>>>0<(ad+16|0)>>>0?Y:W;W=ac+8|0;_=ab+8|0;if((_&7|0)==0){aD=0}else{aD=-_&7}_=aa-40-aD|0;c[528]=ab+aD;c[525]=_;c[ab+(aD+4)>>2]=_|1;c[ab+(aa-36)>>2]=40;c[529]=c[240];c[ac+4>>2]=27;c[W>>2]=c[634];c[W+4>>2]=c[635];c[W+8>>2]=c[636];c[W+12>>2]=c[637];c[634]=ab;c[635]=aa;c[637]=0;c[636]=W;W=ac+28|0;c[W>>2]=7;if((ac+32|0)>>>0<aB>>>0){_=W;while(1){W=_+4|0;c[W>>2]=7;if((_+8|0)>>>0<aB>>>0){_=W}else{break}}}if((ac|0)==(Y|0)){break}_=ac-ad|0;W=Y+(_+4)|0;c[W>>2]=c[W>>2]&-2;c[ad+4>>2]=_|1;c[Y+_>>2]=_;W=_>>>3;if(_>>>0<256){K=W<<1;Z=2128+(K<<2)|0;S=c[522]|0;m=1<<W;do{if((S&m|0)==0){c[522]=S|m;aE=Z;aF=2128+(K+2<<2)|0}else{W=2128+(K+2<<2)|0;Q=c[W>>2]|0;if(Q>>>0>=(c[526]|0)>>>0){aE=Q;aF=W;break}az();return 0}}while(0);c[aF>>2]=ad;c[aE+12>>2]=ad;c[ad+8>>2]=aE;c[ad+12>>2]=Z;break}K=ad;m=_>>>8;do{if((m|0)==0){aG=0}else{if(_>>>0>16777215){aG=31;break}S=(m+1048320|0)>>>16&8;Y=m<<S;ac=(Y+520192|0)>>>16&4;W=Y<<ac;Y=(W+245760|0)>>>16&2;Q=14-(ac|S|Y)+(W<<Y>>>15)|0;aG=_>>>((Q+7|0)>>>0)&1|Q<<1}}while(0);m=2392+(aG<<2)|0;c[ad+28>>2]=aG;c[ad+20>>2]=0;c[ad+16>>2]=0;Z=c[523]|0;Q=1<<aG;if((Z&Q|0)==0){c[523]=Z|Q;c[m>>2]=K;c[ad+24>>2]=m;c[ad+12>>2]=ad;c[ad+8>>2]=ad;break}if((aG|0)==31){aH=0}else{aH=25-(aG>>>1)|0}Q=_<<aH;Z=c[m>>2]|0;while(1){if((c[Z+4>>2]&-8|0)==(_|0)){break}aI=Z+16+(Q>>>31<<2)|0;m=c[aI>>2]|0;if((m|0)==0){T=1734;break}else{Q=Q<<1;Z=m}}if((T|0)==1734){if(aI>>>0<(c[526]|0)>>>0){az();return 0}else{c[aI>>2]=K;c[ad+24>>2]=Z;c[ad+12>>2]=ad;c[ad+8>>2]=ad;break}}Q=Z+8|0;_=c[Q>>2]|0;m=c[526]|0;if(Z>>>0<m>>>0){az();return 0}if(_>>>0<m>>>0){az();return 0}else{c[_+12>>2]=K;c[Q>>2]=K;c[ad+8>>2]=_;c[ad+12>>2]=Z;c[ad+24>>2]=0;break}}}while(0);ad=c[525]|0;if(ad>>>0<=o>>>0){break}_=ad-o|0;c[525]=_;ad=c[528]|0;Q=ad;c[528]=Q+o;c[Q+(o+4)>>2]=_|1;c[ad+4>>2]=o|3;n=ad+8|0;return n|0}}while(0);c[(bk()|0)>>2]=12;n=0;return n|0}function dQ(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[526]|0;if(b>>>0<e>>>0){az()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){az()}h=f&-8;i=a+(h-8)|0;j=i;L2346:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){az()}if((n|0)==(c[527]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[524]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=2128+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){az()}if((c[k+12>>2]|0)==(n|0)){break}az()}}while(0);if((s|0)==(k|0)){c[522]=c[522]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){az()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}az()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){az()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){az()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){az()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{az()}}}while(0);if((p|0)==0){q=n;r=o;break}v=a+(l+28)|0;m=2392+(c[v>>2]<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[523]=c[523]&~(1<<c[v>>2]);q=n;r=o;break L2346}else{if(p>>>0<(c[526]|0)>>>0){az()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break L2346}}}while(0);if(A>>>0<(c[526]|0)>>>0){az()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[526]|0)>>>0){az()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[526]|0)>>>0){az()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(d>>>0>=i>>>0){az()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){az()}do{if((e&2|0)==0){if((j|0)==(c[528]|0)){B=(c[525]|0)+r|0;c[525]=B;c[528]=q;c[q+4>>2]=B|1;if((q|0)!=(c[527]|0)){return}c[527]=0;c[524]=0;return}if((j|0)==(c[527]|0)){B=(c[524]|0)+r|0;c[524]=B;c[527]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;L2448:do{if(e>>>0<256){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=2128+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[526]|0)>>>0){az()}if((c[u+12>>2]|0)==(j|0)){break}az()}}while(0);if((g|0)==(u|0)){c[522]=c[522]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[526]|0)>>>0){az()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}az()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[526]|0)>>>0){az()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[526]|0)>>>0){az()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){az()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{az()}}}while(0);if((f|0)==0){break}t=a+(h+20)|0;u=2392+(c[t>>2]<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[523]=c[523]&~(1<<c[t>>2]);break L2448}else{if(f>>>0<(c[526]|0)>>>0){az()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break L2448}}}while(0);if(E>>>0<(c[526]|0)>>>0){az()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[526]|0)>>>0){az()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[526]|0)>>>0){az()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[527]|0)){H=B;break}c[524]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256){d=r<<1;e=2128+(d<<2)|0;A=c[522]|0;E=1<<r;do{if((A&E|0)==0){c[522]=A|E;I=e;J=2128+(d+2<<2)|0}else{r=2128+(d+2<<2)|0;h=c[r>>2]|0;if(h>>>0>=(c[526]|0)>>>0){I=h;J=r;break}az()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=2392+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[523]|0;d=1<<K;do{if((r&d|0)==0){c[523]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{if((K|0)==31){L=0}else{L=25-(K>>>1)|0}A=H<<L;J=c[I>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(H|0)){break}M=J+16+(A>>>31<<2)|0;E=c[M>>2]|0;if((E|0)==0){N=1911;break}else{A=A<<1;J=E}}if((N|0)==1911){if(M>>>0<(c[526]|0)>>>0){az()}else{c[M>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break}}A=J+8|0;B=c[A>>2]|0;E=c[526]|0;if(J>>>0<E>>>0){az()}if(B>>>0<E>>>0){az()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=J;c[q+24>>2]=0;break}}}while(0);q=(c[530]|0)-1|0;c[530]=q;if((q|0)==0){O=2544}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[530]=-1;return}function dR(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((a|0)==0){d=0}else{e=ab(b,a)|0;if((b|a)>>>0<=65535){d=e;break}d=((e>>>0)/(a>>>0)|0|0)==(b|0)?e:-1}}while(0);b=dP(d)|0;if((b|0)==0){return b|0}if((c[b-4>>2]&3|0)==0){return b|0}eN(b|0,0,d|0);return b|0}function dS(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;if((a|0)==0){d=dP(b)|0;return d|0}if(b>>>0>4294967231){c[(bk()|0)>>2]=12;d=0;return d|0}if(b>>>0<11){e=16}else{e=b+11&-8}f=dT(a-8|0,e)|0;if((f|0)!=0){d=f+8|0;return d|0}f=dP(b)|0;if((f|0)==0){d=0;return d|0}e=c[a-4>>2]|0;g=(e&-8)-((e&3|0)==0?8:4)|0;e=g>>>0<b>>>0?g:b;eO(f|0,a|0,e)|0;dQ(a);d=f;return d|0}function dT(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;d=a+4|0;e=c[d>>2]|0;f=e&-8;g=a;h=g+f|0;i=h;j=c[526]|0;if(g>>>0<j>>>0){az();return 0}k=e&3;if(!((k|0)!=1&g>>>0<h>>>0)){az();return 0}l=g+(f|4)|0;m=c[l>>2]|0;if((m&1|0)==0){az();return 0}if((k|0)==0){if(b>>>0<256){n=0;return n|0}do{if(f>>>0>=(b+4|0)>>>0){if((f-b|0)>>>0>c[238]<<1>>>0){break}else{n=a}return n|0}}while(0);n=0;return n|0}if(f>>>0>=b>>>0){k=f-b|0;if(k>>>0<=15){n=a;return n|0}c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|3;c[l>>2]=c[l>>2]|1;eb(g+b|0,k);n=a;return n|0}if((i|0)==(c[528]|0)){k=(c[525]|0)+f|0;if(k>>>0<=b>>>0){n=0;return n|0}l=k-b|0;c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=l|1;c[528]=g+b;c[525]=l;n=a;return n|0}if((i|0)==(c[527]|0)){l=(c[524]|0)+f|0;if(l>>>0<b>>>0){n=0;return n|0}k=l-b|0;if(k>>>0>15){c[d>>2]=e&1|b|2;c[g+(b+4)>>2]=k|1;c[g+l>>2]=k;o=g+(l+4)|0;c[o>>2]=c[o>>2]&-2;p=g+b|0;q=k}else{c[d>>2]=e&1|l|2;e=g+(l+4)|0;c[e>>2]=c[e>>2]|1;p=0;q=0}c[524]=q;c[527]=p;n=a;return n|0}if((m&2|0)!=0){n=0;return n|0}p=(m&-8)+f|0;if(p>>>0<b>>>0){n=0;return n|0}q=p-b|0;e=m>>>3;L2647:do{if(m>>>0<256){l=c[g+(f+8)>>2]|0;k=c[g+(f+12)>>2]|0;o=2128+(e<<1<<2)|0;do{if((l|0)!=(o|0)){if(l>>>0<j>>>0){az();return 0}if((c[l+12>>2]|0)==(i|0)){break}az();return 0}}while(0);if((k|0)==(l|0)){c[522]=c[522]&~(1<<e);break}do{if((k|0)==(o|0)){r=k+8|0}else{if(k>>>0<j>>>0){az();return 0}s=k+8|0;if((c[s>>2]|0)==(i|0)){r=s;break}az();return 0}}while(0);c[l+12>>2]=k;c[r>>2]=l}else{o=h;s=c[g+(f+24)>>2]|0;t=c[g+(f+12)>>2]|0;do{if((t|0)==(o|0)){u=g+(f+20)|0;v=c[u>>2]|0;if((v|0)==0){w=g+(f+16)|0;x=c[w>>2]|0;if((x|0)==0){y=0;break}else{z=x;A=w}}else{z=v;A=u}while(1){u=z+20|0;v=c[u>>2]|0;if((v|0)!=0){z=v;A=u;continue}u=z+16|0;v=c[u>>2]|0;if((v|0)==0){break}else{z=v;A=u}}if(A>>>0<j>>>0){az();return 0}else{c[A>>2]=0;y=z;break}}else{u=c[g+(f+8)>>2]|0;if(u>>>0<j>>>0){az();return 0}v=u+12|0;if((c[v>>2]|0)!=(o|0)){az();return 0}w=t+8|0;if((c[w>>2]|0)==(o|0)){c[v>>2]=t;c[w>>2]=u;y=t;break}else{az();return 0}}}while(0);if((s|0)==0){break}t=g+(f+28)|0;l=2392+(c[t>>2]<<2)|0;do{if((o|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[523]=c[523]&~(1<<c[t>>2]);break L2647}else{if(s>>>0<(c[526]|0)>>>0){az();return 0}k=s+16|0;if((c[k>>2]|0)==(o|0)){c[k>>2]=y}else{c[s+20>>2]=y}if((y|0)==0){break L2647}}}while(0);if(y>>>0<(c[526]|0)>>>0){az();return 0}c[y+24>>2]=s;o=c[g+(f+16)>>2]|0;do{if((o|0)!=0){if(o>>>0<(c[526]|0)>>>0){az();return 0}else{c[y+16>>2]=o;c[o+24>>2]=y;break}}}while(0);o=c[g+(f+20)>>2]|0;if((o|0)==0){break}if(o>>>0<(c[526]|0)>>>0){az();return 0}else{c[y+20>>2]=o;c[o+24>>2]=y;break}}}while(0);if(q>>>0<16){c[d>>2]=p|c[d>>2]&1|2;y=g+(p|4)|0;c[y>>2]=c[y>>2]|1;n=a;return n|0}else{c[d>>2]=c[d>>2]&1|b|2;c[g+(b+4)>>2]=q|3;d=g+(p|4)|0;c[d>>2]=c[d>>2]|1;eb(g+b|0,q);n=a;return n|0}return 0}function dU(a,b){a=a|0;b=b|0;var d=0;if((a|0)==0){return 0}if(b>>>0>4294967231){c[(bk()|0)>>2]=12;return 0}if(b>>>0<11){d=16}else{d=b+11&-8}b=a-8|0;return((dT(b,d)|0)==(b|0)?a:0)|0}function dV(a,b){a=a|0;b=b|0;var c=0;if(a>>>0<9){c=dP(b)|0;return c|0}else{c=dW(a,b)|0;return c|0}return 0}function dW(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;d=a>>>0<16?16:a;if((d-1&d|0)==0){e=d}else{a=16;while(1){if(a>>>0<d>>>0){a=a<<1}else{e=a;break}}}if((-64-e|0)>>>0<=b>>>0){c[(bk()|0)>>2]=12;f=0;return f|0}if(b>>>0<11){g=16}else{g=b+11&-8}b=dP(e+12+g|0)|0;if((b|0)==0){f=0;return f|0}a=b-8|0;d=a;h=e-1|0;do{if((b&h|0)==0){i=d}else{j=b+h&-e;k=j-8|0;l=a;if((k-l|0)>>>0>15){m=k}else{m=j+(e-8)|0}j=m;k=m-l|0;l=b-4|0;n=c[l>>2]|0;o=(n&-8)-k|0;if((n&3|0)==0){c[m>>2]=(c[a>>2]|0)+k;c[m+4>>2]=o;i=j;break}else{n=m+4|0;c[n>>2]=o|c[n>>2]&1|2;n=m+(o+4)|0;c[n>>2]=c[n>>2]|1;c[l>>2]=k|c[l>>2]&1|2;l=b+(k-4)|0;c[l>>2]=c[l>>2]|1;eb(d,k);i=j;break}}}while(0);d=i+4|0;b=c[d>>2]|0;do{if((b&3|0)!=0){m=b&-8;if(m>>>0<=(g+16|0)>>>0){break}a=m-g|0;e=i;c[d>>2]=g|b&1|2;c[e+(g|4)>>2]=a|3;h=e+(m|4)|0;c[h>>2]=c[h>>2]|1;eb(e+g|0,a)}}while(0);f=i+8|0;return f|0}function dX(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;do{if((b|0)==8){e=dP(d)|0}else{f=b>>>2;if((b&3|0)!=0|(f|0)==0){g=22;return g|0}if((f+1073741823&f|0)!=0){g=22;return g|0}if((-64-b|0)>>>0<d>>>0){g=12;return g|0}else{e=dW(b>>>0<16?16:b,d)|0;break}}}while(0);if((e|0)==0){g=12;return g|0}c[a>>2]=e;g=0;return g|0}function dY(a){a=a|0;var b=0,d=0,e=0;if((c[236]|0)!=0){b=c[237]|0;d=dV(b,a)|0;return d|0}e=at(30)|0;if((e-1&e|0)!=0){az();return 0}c[238]=e;c[237]=e;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;b=c[237]|0;d=dV(b,a)|0;return d|0}function dZ(a){a=a|0;var b=0;do{if((c[236]|0)==0){b=at(30)|0;if((b-1&b|0)==0){c[238]=b;c[237]=b;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az();return 0}}}while(0);b=c[237]|0;return dV(b,a-1+b&-b)|0}function d_(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=i;i=i+8|0;f=e|0;c[f>>2]=b;b=d$(a,f,3,d)|0;i=e;return b|0}function d$(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;do{if((c[236]|0)==0){f=at(30)|0;if((f-1&f|0)==0){c[238]=f;c[237]=f;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az();return 0}}}while(0);f=(a|0)==0;do{if((e|0)==0){if(f){g=dP(0)|0;return g|0}else{h=a<<2;if(h>>>0<11){i=0;j=16;break}i=0;j=h+11&-8;break}}else{if(f){g=e}else{i=e;j=0;break}return g|0}}while(0);do{if((d&1|0)==0){if(f){k=0;l=0;break}else{m=0;n=0}while(1){e=c[b+(n<<2)>>2]|0;if(e>>>0<11){o=16}else{o=e+11&-8}e=o+m|0;h=n+1|0;if((h|0)==(a|0)){k=0;l=e;break}else{m=e;n=h}}}else{h=c[b>>2]|0;if(h>>>0<11){p=16}else{p=h+11&-8}k=p;l=ab(p,a)|0}}while(0);p=dP(j-4+l|0)|0;if((p|0)==0){g=0;return g|0}n=p-8|0;m=c[p-4>>2]&-8;if((d&2|0)!=0){eN(p|0,0,-4-j+m|0)}if((i|0)==0){c[p+(l-4)>>2]=m-l|3;q=p+l|0;r=l}else{q=i;r=m}c[q>>2]=p;p=a-1|0;L2840:do{if((p|0)==0){s=n;t=r}else{if((k|0)==0){u=n;v=r;w=0}else{a=n;m=r;i=0;while(1){l=m-k|0;c[a+4>>2]=k|3;j=a+k|0;d=i+1|0;c[q+(d<<2)>>2]=a+(k+8);if((d|0)==(p|0)){s=j;t=l;break L2840}else{a=j;m=l;i=d}}}while(1){i=c[b+(w<<2)>>2]|0;if(i>>>0<11){x=16}else{x=i+11&-8}i=v-x|0;c[u+4>>2]=x|3;m=u+x|0;a=w+1|0;c[q+(a<<2)>>2]=u+(x+8);if((a|0)==(p|0)){s=m;t=i;break}else{u=m;v=i;w=a}}}}while(0);c[s+4>>2]=t|3;g=q;return g|0}function d0(a,b,c){a=a|0;b=b|0;c=c|0;return d$(a,b,0,c)|0}function d1(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;d=a+(b<<2)|0;if((b|0)==0){return 0}else{e=a}L2856:while(1){a=c[e>>2]|0;L2858:do{if((a|0)==0){f=e+4|0}else{b=a-8|0;g=b;h=a-4|0;i=c[h>>2]&-8;c[e>>2]=0;if(b>>>0<(c[526]|0)>>>0){j=2190;break L2856}b=c[h>>2]|0;if((b&3|0)==1){j=2189;break L2856}k=e+4|0;l=b-8&-8;do{if((k|0)!=(d|0)){if((c[k>>2]|0)!=(a+(l+8)|0)){break}m=(c[a+(l|4)>>2]&-8)+i|0;c[h>>2]=b&1|m|2;n=a+(m-4)|0;c[n>>2]=c[n>>2]|1;c[k>>2]=a;f=k;break L2858}}while(0);eb(g,i);f=k}}while(0);if((f|0)==(d|0)){j=2187;break}else{e=f}}if((j|0)==2189){az();return 0}else if((j|0)==2190){az();return 0}else if((j|0)==2187){return 0}return 0}function d2(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0;do{if((c[236]|0)==0){b=at(30)|0;if((b-1&b|0)==0){c[238]=b;c[237]=b;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az();return 0}}}while(0);if(a>>>0>=4294967232){d=0;return d|0}b=c[528]|0;if((b|0)==0){d=0;return d|0}e=c[525]|0;do{if(e>>>0>(a+40|0)>>>0){f=c[238]|0;g=ab((((-41-a+e+f|0)>>>0)/(f>>>0)|0)-1|0,f)|0;h=b;i=2536;while(1){j=c[i>>2]|0;if(j>>>0<=h>>>0){if((j+(c[i+4>>2]|0)|0)>>>0>h>>>0){k=i;break}}j=c[i+8>>2]|0;if((j|0)==0){k=0;break}else{i=j}}if((c[k+12>>2]&8|0)!=0){break}i=bh(0)|0;h=k+4|0;if((i|0)!=((c[k>>2]|0)+(c[h>>2]|0)|0)){break}j=bh(-(g>>>0>2147483646?-2147483648-f|0:g)|0)|0;l=bh(0)|0;if(!((j|0)!=-1&l>>>0<i>>>0)){break}j=i-l|0;if((i|0)==(l|0)){break}c[h>>2]=(c[h>>2]|0)-j;c[630]=(c[630]|0)-j;h=c[528]|0;l=(c[525]|0)-j|0;j=h;i=h+8|0;if((i&7|0)==0){m=0}else{m=-i&7}i=l-m|0;c[528]=j+m;c[525]=i;c[j+(m+4)>>2]=i|1;c[j+(l+4)>>2]=40;c[529]=c[240];d=1;return d|0}}while(0);if((c[525]|0)>>>0<=(c[529]|0)>>>0){d=0;return d|0}c[529]=-1;d=0;return d|0}function d3(){return c[630]|0}function d4(){return c[631]|0}function d5(){var a=0;a=c[632]|0;return((a|0)==0?-1:a)|0}function d6(a){a=a|0;var b=0,d=0;if((a|0)==-1){b=0}else{d=c[238]|0;b=a-1+d&-d}c[632]=b;return b|0}function d7(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;do{if((c[236]|0)==0){b=at(30)|0;if((b-1&b|0)==0){c[238]=b;c[237]=b;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az()}}}while(0);b=c[528]|0;if((b|0)==0){d=0;e=0;f=0;g=0;h=0;i=0;j=0}else{k=c[525]|0;l=k+40|0;m=1;n=l;o=l;l=2536;while(1){p=c[l>>2]|0;q=p+8|0;if((q&7|0)==0){r=0}else{r=-q&7}q=p+(c[l+4>>2]|0)|0;s=m;t=n;u=o;v=p+r|0;while(1){if(v>>>0>=q>>>0|(v|0)==(b|0)){w=s;x=t;y=u;break}z=c[v+4>>2]|0;if((z|0)==7){w=s;x=t;y=u;break}A=z&-8;B=A+u|0;if((z&3|0)==1){C=A+t|0;D=s+1|0}else{C=t;D=s}z=v+A|0;if(z>>>0<p>>>0){w=D;x=C;y=B;break}else{s=D;t=C;u=B;v=z}}v=c[l+8>>2]|0;if((v|0)==0){break}else{m=w;n=x;o=y;l=v}}l=c[630]|0;d=k;e=y;f=w;g=l-y|0;h=c[631]|0;i=l-x|0;j=x}c[a>>2]=e;c[a+4>>2]=f;f=a+8|0;c[f>>2]=0;c[f+4>>2]=0;c[a+16>>2]=g;c[a+20>>2]=h;c[a+24>>2]=0;c[a+28>>2]=i;c[a+32>>2]=j;c[a+36>>2]=d;return}function d8(){var a=0,b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;a=i;do{if((c[236]|0)==0){b=at(30)|0;if((b-1&b|0)==0){c[238]=b;c[237]=b;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az()}}}while(0);b=c[528]|0;if((b|0)==0){d=0;e=0;f=0}else{g=c[631]|0;h=c[630]|0;j=h-40-(c[525]|0)|0;k=2536;while(1){l=c[k>>2]|0;n=l+8|0;if((n&7|0)==0){o=0}else{o=-n&7}n=l+(c[k+4>>2]|0)|0;p=j;q=l+o|0;while(1){if(q>>>0>=n>>>0|(q|0)==(b|0)){r=p;break}s=c[q+4>>2]|0;if((s|0)==7){r=p;break}t=s&-8;u=p-((s&3|0)==1?t:0)|0;s=q+t|0;if(s>>>0<l>>>0){r=u;break}else{p=u;q=s}}q=c[k+8>>2]|0;if((q|0)==0){d=r;e=h;f=g;break}else{j=r;k=q}}}k=c[m>>2]|0;aA(k|0,448,(r=i,i=i+8|0,c[r>>2]=f,r)|0)|0;i=r;aA(k|0,608,(r=i,i=i+8|0,c[r>>2]=e,r)|0)|0;i=r;aA(k|0,496,(r=i,i=i+8|0,c[r>>2]=d,r)|0)|0;i=r;i=a;return}function d9(a,b){a=a|0;b=b|0;var d=0,e=0;do{if((c[236]|0)==0){d=at(30)|0;if((d-1&d|0)==0){c[238]=d;c[237]=d;c[239]=-1;c[240]=-1;c[241]=0;c[633]=0;c[236]=(bp(0)|0)&-16^1431655768;break}else{az();return 0}}}while(0);if((a|0)==(-2|0)){if((c[237]|0)>>>0>b>>>0){e=0;return e|0}if((b-1&b|0)!=0){e=0;return e|0}c[238]=b;e=1;return e|0}else if((a|0)==(-3|0)){c[239]=b;e=1;return e|0}else if((a|0)==(-1|0)){c[240]=b;e=1;return e|0}else{e=0;return e|0}return 0}function ea(a){a=a|0;var b=0,d=0,e=0;do{if((a|0)==0){b=0}else{d=c[a-4>>2]|0;e=d&3;if((e|0)==1){b=0;break}b=(d&-8)-((e|0)==0?8:4)|0}}while(0);return b|0}function eb(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;d=a;e=d+b|0;f=e;g=c[a+4>>2]|0;L2984:do{if((g&1|0)==0){h=c[a>>2]|0;if((g&3|0)==0){return}i=d+(-h|0)|0;j=i;k=h+b|0;l=c[526]|0;if(i>>>0<l>>>0){az()}if((j|0)==(c[527]|0)){m=d+(b+4)|0;if((c[m>>2]&3|0)!=3){n=j;o=k;break}c[524]=k;c[m>>2]=c[m>>2]&-2;c[d+(4-h)>>2]=k|1;c[e>>2]=k;return}m=h>>>3;if(h>>>0<256){p=c[d+(8-h)>>2]|0;q=c[d+(12-h)>>2]|0;r=2128+(m<<1<<2)|0;do{if((p|0)!=(r|0)){if(p>>>0<l>>>0){az()}if((c[p+12>>2]|0)==(j|0)){break}az()}}while(0);if((q|0)==(p|0)){c[522]=c[522]&~(1<<m);n=j;o=k;break}do{if((q|0)==(r|0)){s=q+8|0}else{if(q>>>0<l>>>0){az()}t=q+8|0;if((c[t>>2]|0)==(j|0)){s=t;break}az()}}while(0);c[p+12>>2]=q;c[s>>2]=p;n=j;o=k;break}r=i;m=c[d+(24-h)>>2]|0;t=c[d+(12-h)>>2]|0;do{if((t|0)==(r|0)){u=16-h|0;v=d+(u+4)|0;w=c[v>>2]|0;if((w|0)==0){x=d+u|0;u=c[x>>2]|0;if((u|0)==0){y=0;break}else{z=u;A=x}}else{z=w;A=v}while(1){v=z+20|0;w=c[v>>2]|0;if((w|0)!=0){z=w;A=v;continue}v=z+16|0;w=c[v>>2]|0;if((w|0)==0){break}else{z=w;A=v}}if(A>>>0<l>>>0){az()}else{c[A>>2]=0;y=z;break}}else{v=c[d+(8-h)>>2]|0;if(v>>>0<l>>>0){az()}w=v+12|0;if((c[w>>2]|0)!=(r|0)){az()}x=t+8|0;if((c[x>>2]|0)==(r|0)){c[w>>2]=t;c[x>>2]=v;y=t;break}else{az()}}}while(0);if((m|0)==0){n=j;o=k;break}t=d+(28-h)|0;l=2392+(c[t>>2]<<2)|0;do{if((r|0)==(c[l>>2]|0)){c[l>>2]=y;if((y|0)!=0){break}c[523]=c[523]&~(1<<c[t>>2]);n=j;o=k;break L2984}else{if(m>>>0<(c[526]|0)>>>0){az()}i=m+16|0;if((c[i>>2]|0)==(r|0)){c[i>>2]=y}else{c[m+20>>2]=y}if((y|0)==0){n=j;o=k;break L2984}}}while(0);if(y>>>0<(c[526]|0)>>>0){az()}c[y+24>>2]=m;r=16-h|0;t=c[d+r>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[526]|0)>>>0){az()}else{c[y+16>>2]=t;c[t+24>>2]=y;break}}}while(0);t=c[d+(r+4)>>2]|0;if((t|0)==0){n=j;o=k;break}if(t>>>0<(c[526]|0)>>>0){az()}else{c[y+20>>2]=t;c[t+24>>2]=y;n=j;o=k;break}}else{n=a;o=b}}while(0);a=c[526]|0;if(e>>>0<a>>>0){az()}y=d+(b+4)|0;z=c[y>>2]|0;do{if((z&2|0)==0){if((f|0)==(c[528]|0)){A=(c[525]|0)+o|0;c[525]=A;c[528]=n;c[n+4>>2]=A|1;if((n|0)!=(c[527]|0)){return}c[527]=0;c[524]=0;return}if((f|0)==(c[527]|0)){A=(c[524]|0)+o|0;c[524]=A;c[527]=n;c[n+4>>2]=A|1;c[n+A>>2]=A;return}A=(z&-8)+o|0;s=z>>>3;L3083:do{if(z>>>0<256){g=c[d+(b+8)>>2]|0;t=c[d+(b+12)>>2]|0;h=2128+(s<<1<<2)|0;do{if((g|0)!=(h|0)){if(g>>>0<a>>>0){az()}if((c[g+12>>2]|0)==(f|0)){break}az()}}while(0);if((t|0)==(g|0)){c[522]=c[522]&~(1<<s);break}do{if((t|0)==(h|0)){B=t+8|0}else{if(t>>>0<a>>>0){az()}m=t+8|0;if((c[m>>2]|0)==(f|0)){B=m;break}az()}}while(0);c[g+12>>2]=t;c[B>>2]=g}else{h=e;m=c[d+(b+24)>>2]|0;l=c[d+(b+12)>>2]|0;do{if((l|0)==(h|0)){i=d+(b+20)|0;p=c[i>>2]|0;if((p|0)==0){q=d+(b+16)|0;v=c[q>>2]|0;if((v|0)==0){C=0;break}else{D=v;E=q}}else{D=p;E=i}while(1){i=D+20|0;p=c[i>>2]|0;if((p|0)!=0){D=p;E=i;continue}i=D+16|0;p=c[i>>2]|0;if((p|0)==0){break}else{D=p;E=i}}if(E>>>0<a>>>0){az()}else{c[E>>2]=0;C=D;break}}else{i=c[d+(b+8)>>2]|0;if(i>>>0<a>>>0){az()}p=i+12|0;if((c[p>>2]|0)!=(h|0)){az()}q=l+8|0;if((c[q>>2]|0)==(h|0)){c[p>>2]=l;c[q>>2]=i;C=l;break}else{az()}}}while(0);if((m|0)==0){break}l=d+(b+28)|0;g=2392+(c[l>>2]<<2)|0;do{if((h|0)==(c[g>>2]|0)){c[g>>2]=C;if((C|0)!=0){break}c[523]=c[523]&~(1<<c[l>>2]);break L3083}else{if(m>>>0<(c[526]|0)>>>0){az()}t=m+16|0;if((c[t>>2]|0)==(h|0)){c[t>>2]=C}else{c[m+20>>2]=C}if((C|0)==0){break L3083}}}while(0);if(C>>>0<(c[526]|0)>>>0){az()}c[C+24>>2]=m;h=c[d+(b+16)>>2]|0;do{if((h|0)!=0){if(h>>>0<(c[526]|0)>>>0){az()}else{c[C+16>>2]=h;c[h+24>>2]=C;break}}}while(0);h=c[d+(b+20)>>2]|0;if((h|0)==0){break}if(h>>>0<(c[526]|0)>>>0){az()}else{c[C+20>>2]=h;c[h+24>>2]=C;break}}}while(0);c[n+4>>2]=A|1;c[n+A>>2]=A;if((n|0)!=(c[527]|0)){F=A;break}c[524]=A;return}else{c[y>>2]=z&-2;c[n+4>>2]=o|1;c[n+o>>2]=o;F=o}}while(0);o=F>>>3;if(F>>>0<256){z=o<<1;y=2128+(z<<2)|0;C=c[522]|0;b=1<<o;do{if((C&b|0)==0){c[522]=C|b;G=y;H=2128+(z+2<<2)|0}else{o=2128+(z+2<<2)|0;d=c[o>>2]|0;if(d>>>0>=(c[526]|0)>>>0){G=d;H=o;break}az()}}while(0);c[H>>2]=n;c[G+12>>2]=n;c[n+8>>2]=G;c[n+12>>2]=y;return}y=n;G=F>>>8;do{if((G|0)==0){I=0}else{if(F>>>0>16777215){I=31;break}H=(G+1048320|0)>>>16&8;z=G<<H;b=(z+520192|0)>>>16&4;C=z<<b;z=(C+245760|0)>>>16&2;o=14-(b|H|z)+(C<<z>>>15)|0;I=F>>>((o+7|0)>>>0)&1|o<<1}}while(0);G=2392+(I<<2)|0;c[n+28>>2]=I;c[n+20>>2]=0;c[n+16>>2]=0;o=c[523]|0;z=1<<I;if((o&z|0)==0){c[523]=o|z;c[G>>2]=y;c[n+24>>2]=G;c[n+12>>2]=n;c[n+8>>2]=n;return}if((I|0)==31){J=0}else{J=25-(I>>>1)|0}I=F<<J;J=c[G>>2]|0;while(1){if((c[J+4>>2]&-8|0)==(F|0)){break}K=J+16+(I>>>31<<2)|0;G=c[K>>2]|0;if((G|0)==0){L=2400;break}else{I=I<<1;J=G}}if((L|0)==2400){if(K>>>0<(c[526]|0)>>>0){az()}c[K>>2]=y;c[n+24>>2]=J;c[n+12>>2]=n;c[n+8>>2]=n;return}K=J+8|0;L=c[K>>2]|0;I=c[526]|0;if(J>>>0<I>>>0){az()}if(L>>>0<I>>>0){az()}c[L+12>>2]=y;c[K>>2]=y;c[n+8>>2]=L;c[n+12>>2]=J;c[n+24>>2]=0;return}function ec(a){a=a|0;var b=0,d=0,e=0;b=(a|0)==0?1:a;while(1){d=dP(b)|0;if((d|0)!=0){e=2444;break}a=(D=c[642]|0,c[642]=D+0,D);if((a|0)==0){break}bA[a&127]()}if((e|0)==2444){return d|0}d=a1(4)|0;c[d>>2]=760;av(d|0,888,72);return 0}function ed(){return(D=c[642]|0,c[642]=D+0,D)|0}function ee(a,b){a=a|0;b=b|0;return ec(a)|0}function ef(a){a=a|0;return ec(a)|0}function eg(a,b){a=a|0;b=b|0;return ef(a)|0}function eh(a){a=a|0;if((a|0)==0){return}dQ(a);return}function ei(a,b){a=a|0;b=b|0;eh(a);return}function ej(a){a=a|0;eh(a);return}function ek(a,b){a=a|0;b=b|0;ej(a);return}function el(a){a=a|0;return(D=c[642]|0,c[642]=a,D)|0}function em(a){a=a|0;c[a>>2]=760;return}function en(a){a=a|0;eh(a);return}function eo(a){a=a|0;return}function ep(a){a=a|0;return 480}function eq(a){a=a|0;c[a>>2]=792;return}function er(a){a=a|0;eh(a);return}function es(a){a=a|0;return 640}function et(){var a=0;a=a1(4)|0;c[a>>2]=760;av(a|0,888,72)}function eu(a,b,c){a=a|0;b=b|0;c=c|0;return ev(a,b,c,0,0,0)|0}function ev(b,d,e,f,g,h){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0;j=i;if((e|0)==0){k=-1;i=j;return k|0}l=c[44]|0;if((l|0)==0){c[232]=1;c[44]=1;m=1;n=1;o=2483}else{p=c[232]|0;q=c[76]|0;if((q|0)==-1|(p|0)!=0){m=p;n=l;o=2483}else{r=q;s=p;t=l}}if((o|0)==2483){l=(a4(432)|0)!=0|0;c[76]=l;r=l;s=m;t=n}n=a[e]|0;if(n<<24>>24==45){u=h|2;o=2487}else{m=(r|0)!=0|n<<24>>24==43?h&-2:h;if(n<<24>>24==43){u=m;o=2487}else{v=e;w=m}}if((o|0)==2487){v=e+1|0;w=u}c[234]=0;if((s|0)==0){x=t;o=2491}else{c[50]=-1;c[48]=-1;y=t;z=s;o=2490}while(1){if((o|0)==2491){o=0;s=c[40]|0;if((a[s]|0)==0){A=x}else{B=s;C=x;break}}else if((o|0)==2490){o=0;if((z|0)==0){x=y;o=2491;continue}else{A=y}}c[232]=0;if((A|0)>=(b|0)){o=2493;break}D=d+(A<<2)|0;E=c[D>>2]|0;c[40]=E;if((a[E]|0)==45){F=E+1|0;G=a[F]|0;if(G<<24>>24!=0){o=2525;break}if((aH(v|0,45)|0)!=0){o=2525;break}}c[40]=2080;if((w&2|0)!=0){o=2510;break}if((w&1|0)==0){k=-1;o=2592;break}s=c[48]|0;do{if((s|0)==-1){c[48]=A;H=A;I=0}else{t=c[50]|0;if((t|0)==-1){H=A;I=0;break}u=t-s|0;e=A-t|0;m=(u|0)%(e|0)|0;if((m|0)==0){J=e}else{n=e;h=m;while(1){m=(n|0)%(h|0)|0;if((m|0)==0){J=h;break}else{n=h;h=m}}}h=(A-s|0)/(J|0)|0;do{if((J|0)>0){n=-u|0;if((h|0)>0){K=0}else{L=A;M=t;N=s;O=0;break}do{m=K+t|0;r=d+(m<<2)|0;l=0;p=m;m=c[r>>2]|0;while(1){q=((p|0)<(t|0)?e:n)+p|0;P=d+(q<<2)|0;Q=c[P>>2]|0;c[P>>2]=m;c[r>>2]=Q;P=l+1|0;if((P|0)<(h|0)){l=P;p=q;m=Q}else{break}}K=K+1|0;}while((K|0)<(J|0));L=c[44]|0;M=c[50]|0;N=c[48]|0;O=c[232]|0}else{L=A;M=t;N=s;O=0}}while(0);c[48]=L-M+N;c[50]=-1;H=L;I=O}}while(0);s=H+1|0;c[44]=s;y=s;z=I;o=2490}do{if((o|0)==2510){c[44]=A+1;c[234]=c[D>>2];k=1;i=j;return k|0}else if((o|0)==2493){c[40]=2080;I=c[50]|0;z=c[48]|0;do{if((I|0)==-1){if((z|0)==-1){break}c[44]=z}else{y=I-z|0;H=A-I|0;O=(y|0)%(H|0)|0;if((O|0)==0){R=H}else{L=H;N=O;while(1){O=(L|0)%(N|0)|0;if((O|0)==0){R=N;break}else{L=N;N=O}}}N=(A-z|0)/(R|0)|0;do{if((R|0)>0){L=-y|0;if((N|0)>0){S=0}else{T=I;U=z;V=A;break}do{O=S+I|0;M=d+(O<<2)|0;J=0;K=O;O=c[M>>2]|0;while(1){x=((K|0)<(I|0)?H:L)+K|0;s=d+(x<<2)|0;t=c[s>>2]|0;c[s>>2]=O;c[M>>2]=t;s=J+1|0;if((s|0)<(N|0)){J=s;K=x;O=t}else{break}}S=S+1|0;}while((S|0)<(R|0));T=c[50]|0;U=c[48]|0;V=c[44]|0}else{T=I;U=z;V=A}}while(0);c[44]=U-T+V}}while(0);c[50]=-1;c[48]=-1;k=-1;i=j;return k|0}else if((o|0)==2592){i=j;return k|0}else if((o|0)==2525){z=c[48]|0;I=c[50]|0;if((z|0)!=-1&(I|0)==-1){c[50]=A;W=a[F]|0;X=A}else{W=G;X=I}if(W<<24>>24==0){B=E;C=A;break}c[40]=F;if((a[F]|0)!=45){B=F;C=A;break}if((a[E+2|0]|0)!=0){B=F;C=A;break}I=A+1|0;c[44]=I;c[40]=2080;if((X|0)!=-1){N=X-z|0;H=I-X|0;y=(N|0)%(H|0)|0;if((y|0)==0){Y=H}else{L=H;O=y;while(1){y=(L|0)%(O|0)|0;if((y|0)==0){Y=O;break}else{L=O;O=y}}}O=(I-z|0)/(Y|0)|0;do{if((Y|0)>0){L=-N|0;if((O|0)>0){Z=0}else{_=X;$=z;aa=I;break}do{y=Z+X|0;K=d+(y<<2)|0;J=0;M=y;y=c[K>>2]|0;while(1){t=((M|0)<(X|0)?H:L)+M|0;x=d+(t<<2)|0;s=c[x>>2]|0;c[x>>2]=y;c[K>>2]=s;x=J+1|0;if((x|0)<(O|0)){J=x;M=t;y=s}else{break}}Z=Z+1|0;}while((Z|0)<(Y|0));_=c[50]|0;$=c[48]|0;aa=c[44]|0}else{_=X;$=z;aa=I}}while(0);c[44]=$-_+aa}c[50]=-1;c[48]=-1;k=-1;i=j;return k|0}}while(0);aa=(f|0)!=0;L3325:do{if(aa){if((B|0)==(c[d+(C<<2)>>2]|0)){ab=B;break}_=a[B]|0;do{if(_<<24>>24==45){c[40]=B+1;ac=0}else{if((w&4|0)==0){ab=B;break L3325}if(_<<24>>24==58){ac=0;break}ac=(aH(v|0,_<<24>>24|0)|0)!=0|0}}while(0);_=ey(d,v,f,g,ac)|0;if((_|0)==-1){ab=c[40]|0;break}c[40]=2080;k=_;i=j;return k|0}else{ab=B}}while(0);B=ab+1|0;c[40]=B;ac=a[ab]|0;ab=ac<<24>>24;if((ac<<24>>24|0)==58){o=2556}else if((ac<<24>>24|0)==45){if((a[B]|0)==0){o=2553}}else{o=2553}do{if((o|0)==2553){w=aH(v|0,ab|0)|0;if((w|0)==0){if(ac<<24>>24!=45){o=2556;break}if((a[B]|0)==0){k=-1}else{break}i=j;return k|0}C=a[w+1|0]|0;if(aa&ac<<24>>24==87&C<<24>>24==59){do{if((a[B]|0)==0){_=(c[44]|0)+1|0;c[44]=_;if((_|0)<(b|0)){c[40]=c[d+(_<<2)>>2];break}c[40]=2080;do{if((c[46]|0)!=0){if((a[v]|0)==58){break}eC(48,(ad=i,i=i+8|0,c[ad>>2]=ab,ad)|0);i=ad}}while(0);c[42]=ab;k=(a[v]|0)==58?58:63;i=j;return k|0}}while(0);_=ey(d,v,f,g,0)|0;c[40]=2080;k=_;i=j;return k|0}if(C<<24>>24!=58){if((a[B]|0)!=0){k=ab;i=j;return k|0}c[44]=(c[44]|0)+1;k=ab;i=j;return k|0}c[234]=0;do{if((a[B]|0)==0){if((a[w+2|0]|0)==58){break}_=(c[44]|0)+1|0;c[44]=_;if((_|0)<(b|0)){c[234]=c[d+(_<<2)>>2];break}c[40]=2080;do{if((c[46]|0)!=0){if((a[v]|0)==58){break}eC(48,(ad=i,i=i+8|0,c[ad>>2]=ab,ad)|0);i=ad}}while(0);c[42]=ab;k=(a[v]|0)==58?58:63;i=j;return k|0}else{c[234]=B}}while(0);c[40]=2080;c[44]=(c[44]|0)+1;k=ab;i=j;return k|0}}while(0);do{if((o|0)==2556){if((a[B]|0)!=0){break}c[44]=(c[44]|0)+1}}while(0);do{if((c[46]|0)!=0){if((a[v]|0)==58){break}eC(280,(ad=i,i=i+8|0,c[ad>>2]=ab,ad)|0);i=ad}}while(0);c[42]=ab;k=63;i=j;return k|0}function ew(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ev(a,b,c,d,e,1)|0}function ex(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ev(a,b,c,d,e,5)|0}function ey(b,d,e,f,g){b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;h=i;j=c[40]|0;k=c[44]|0;l=k+1|0;c[44]=l;m=aH(j|0,61)|0;if((m|0)==0){n=eP(j|0)|0;o=0}else{n=m-j|0;o=m+1|0}m=c[e>>2]|0;L3400:do{if((m|0)!=0){L3402:do{if((g|0)!=0&(n|0)==1){p=0;q=m;while(1){if((a[j]|0)==(a[q]|0)){if((eP(q|0)|0)==1){r=p;break L3402}}p=p+1|0;q=c[e+(p<<4)>>2]|0;if((q|0)==0){break L3400}}}else{q=0;p=-1;s=m;while(1){if((aq(j|0,s|0,n|0)|0)==0){if((eP(s|0)|0)==(n|0)){r=q;break L3402}if((p|0)==-1){t=q}else{break}}else{t=p}u=q+1|0;v=c[e+(u<<4)>>2]|0;if((v|0)==0){r=t;break L3402}else{q=u;p=t;s=v}}do{if((c[46]|0)!=0){if((a[d]|0)==58){break}eC(392,(w=i,i=i+16|0,c[w>>2]=n,c[w+8>>2]=j,w)|0);i=w}}while(0);c[42]=0;x=63;i=h;return x|0}}while(0);if((r|0)==-1){break}s=e+(r<<4)+4|0;p=c[s>>2]|0;q=(o|0)==0;if(!((p|0)!=0|q)){do{if((c[46]|0)!=0){if((a[d]|0)==58){break}eC(208,(w=i,i=i+16|0,c[w>>2]=n,c[w+8>>2]=j,w)|0);i=w}}while(0);if((c[e+(r<<4)+8>>2]|0)==0){y=c[e+(r<<4)+12>>2]|0}else{y=0}c[42]=y;x=(a[d]|0)==58?58:63;i=h;return x|0}do{if((p-1|0)>>>0<2){if(!q){c[234]=o;break}if((p|0)!=1){break}c[44]=k+2;c[234]=c[b+(l<<2)>>2]}}while(0);if(!((c[s>>2]|0)==1&(c[234]|0)==0)){if((f|0)!=0){c[f>>2]=r}p=c[e+(r<<4)+8>>2]|0;q=c[e+(r<<4)+12>>2]|0;if((p|0)==0){x=q;i=h;return x|0}c[p>>2]=q;x=0;i=h;return x|0}do{if((c[46]|0)!=0){if((a[d]|0)==58){break}eC(8,(w=i,i=i+8|0,c[w>>2]=j,w)|0);i=w}}while(0);if((c[e+(r<<4)+8>>2]|0)==0){z=c[e+(r<<4)+12>>2]|0}else{z=0}c[42]=z;c[44]=(c[44]|0)-1;x=(a[d]|0)==58?58:63;i=h;return x|0}}while(0);if((g|0)!=0){c[44]=k;x=-1;i=h;return x|0}do{if((c[46]|0)!=0){if((a[d]|0)==58){break}eC(256,(w=i,i=i+8|0,c[w>>2]=j,w)|0);i=w}}while(0);c[42]=0;x=63;i=h;return x|0}function ez(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e|0;g=f;c[g>>2]=d;c[g+4>>2]=0;eD(a,b,f|0);i=e;return}function eA(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;e=i;i=i+16|0;f=e|0;g=f;c[g>>2]=d;c[g+4>>2]=0;eE(a,b,f|0);i=e;return}function eB(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;i=i+16|0;e=d|0;f=e;c[f>>2]=b;c[f+4>>2]=0;eF(a,e|0);i=d;return}function eC(a,b){a=a|0;b=b|0;var d=0,e=0,f=0;d=i;i=i+16|0;e=d|0;f=e;c[f>>2]=b;c[f+4>>2]=0;eG(a,e|0);i=d;return}function eD(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=c[(bk()|0)>>2]|0;f=c[m>>2]|0;g=c[p>>2]|0;aA(f|0,424,(h=i,i=i+8|0,c[h>>2]=g,h)|0)|0;i=h;if((b|0)!=0){a7(f|0,b|0,d|0)|0;aM(672,2,1,f|0)|0}d=bl(e|0)|0;aA(f|0,544,(h=i,i=i+8|0,c[h>>2]=d,h)|0)|0;i=h;aZ(a|0)}function eE(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0;e=c[m>>2]|0;f=c[p>>2]|0;aA(e|0,600,(g=i,i=i+8|0,c[g>>2]=f,g)|0)|0;i=g;if((b|0)==0){h=aI(10,e|0)|0;aZ(a|0)}a7(e|0,b|0,d|0)|0;h=aI(10,e|0)|0;aZ(a|0)}function eF(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=c[(bk()|0)>>2]|0;f=c[m>>2]|0;g=c[p>>2]|0;aA(f|0,592,(h=i,i=i+8|0,c[h>>2]=g,h)|0)|0;i=h;if((a|0)!=0){a7(f|0,a|0,b|0)|0;aM(664,2,1,f|0)|0}b=bl(e|0)|0;aA(f|0,536,(h=i,i=i+8|0,c[h>>2]=b,h)|0)|0;i=h;i=d;return}function eG(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;d=i;e=c[m>>2]|0;f=c[p>>2]|0;aA(e|0,528,(g=i,i=i+8|0,c[g>>2]=f,g)|0)|0;i=g;if((a|0)==0){h=aI(10,e|0)|0;i=d;return}a7(e|0,a|0,b|0)|0;h=aI(10,e|0)|0;i=d;return}function eH(b,d){b=b|0;d=d|0;var e=0,f=0,g=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0.0,r=0,s=0,t=0,u=0,v=0.0,w=0,x=0,y=0,z=0.0,A=0.0,B=0,C=0,D=0,E=0.0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0.0,O=0,P=0,Q=0.0,R=0.0,S=0.0;e=b;while(1){f=e+1|0;if((bm(a[e]|0)|0)==0){break}else{e=f}}g=a[e]|0;if((g<<24>>24|0)==43){i=f;j=0}else if((g<<24>>24|0)==45){i=f;j=1}else{i=e;j=0}e=-1;f=0;g=i;while(1){k=a[g]|0;if(((k<<24>>24)-48|0)>>>0<10){l=e}else{if(k<<24>>24!=46|(e|0)>-1){break}else{l=f}}e=l;f=f+1|0;g=g+1|0}l=g+(-f|0)|0;i=(e|0)<0;m=((i^1)<<31>>31)+f|0;n=(m|0)>18;o=(n?-18:-m|0)+(i?f:e)|0;e=n?18:m;do{if((e|0)==0){p=b;q=0.0}else{if((e|0)>9){m=l;n=e;f=0;while(1){i=a[m]|0;r=m+1|0;if(i<<24>>24==46){s=a[r]|0;t=m+2|0}else{s=i;t=r}u=(f*10|0)-48+(s<<24>>24)|0;r=n-1|0;if((r|0)>9){m=t;n=r;f=u}else{break}}v=+(u|0)*1.0e9;w=9;x=t;y=2688}else{if((e|0)>0){v=0.0;w=e;x=l;y=2688}else{z=0.0;A=0.0}}if((y|0)==2688){f=x;n=w;m=0;while(1){r=a[f]|0;i=f+1|0;if(r<<24>>24==46){B=a[i]|0;C=f+2|0}else{B=r;C=i}D=(m*10|0)-48+(B<<24>>24)|0;i=n-1|0;if((i|0)>0){f=C;n=i;m=D}else{break}}z=+(D|0);A=v}E=A+z;do{if((k<<24>>24|0)==69|(k<<24>>24|0)==101){m=g+1|0;n=a[m]|0;if((n<<24>>24|0)==43){F=g+2|0;G=0}else if((n<<24>>24|0)==45){F=g+2|0;G=1}else{F=m;G=0}m=a[F]|0;if((m-48|0)>>>0<10){H=F;I=0;J=m}else{K=0;L=F;M=G;break}while(1){m=(I*10|0)-48+J|0;n=H+1|0;f=a[n]|0;if((f-48|0)>>>0<10){H=n;I=m;J=f}else{K=m;L=n;M=G;break}}}else{K=0;L=g;M=0}}while(0);n=o+((M|0)==0?K:-K|0)|0;m=(n|0)<0?-n|0:n;if((m|0)>511){c[(bk()|0)>>2]=34;N=1.0;O=88;P=511;y=2705}else{if((m|0)==0){Q=1.0}else{N=1.0;O=88;P=m;y=2705}}if((y|0)==2705){while(1){y=0;if((P&1|0)==0){R=N}else{R=N*+h[O>>3]}m=P>>1;if((m|0)==0){Q=R;break}else{N=R;O=O+8|0;P=m;y=2705}}}if((n|0)>-1){p=L;q=E*Q;break}else{p=L;q=E/Q;break}}}while(0);if((d|0)!=0){c[d>>2]=p}if((j|0)==0){S=q;return+S}S=-0.0-q;return+S}function eI(a,b){a=a|0;b=b|0;return+(+eH(a,b))}function eJ(a,b){a=a|0;b=b|0;return+(+eH(a,b))}function eK(a,b,c){a=a|0;b=b|0;c=c|0;return+(+eH(a,b))}function eL(a,b,c){a=a|0;b=b|0;c=c|0;return+(+eH(a,b))}function eM(a){a=a|0;return+(+eH(a,0))}function eN(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=b+e|0;if((e|0)>=20){d=d&255;e=b&3;g=d|d<<8|d<<16|d<<24;h=f&~3;if(e){e=b+4-e|0;while((b|0)<(e|0)){a[b]=d;b=b+1|0}}while((b|0)<(h|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}}function eO(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function eP(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function eQ(b,c,d){b=b|0;c=c|0;d=d|0;var e=0,f=0;while((e|0)<(d|0)){a[b+e|0]=f?0:a[c+e|0]|0;f=f?1:(a[c+e|0]|0)==0;e=e+1|0}return b|0}function eR(){az()}function eS(a,b){a=a|0;b=b|0;return bu[a&127](b|0)|0}function eT(a){a=a|0;return ah(0,a|0)|0}function eU(a){a=a|0;return ah(1,a|0)|0}function eV(a){a=a|0;return ah(2,a|0)|0}function eW(a){a=a|0;return ah(3,a|0)|0}function eX(a){a=a|0;return ah(4,a|0)|0}function eY(a){a=a|0;return ah(5,a|0)|0}function eZ(a){a=a|0;return ah(6,a|0)|0}function e_(a){a=a|0;return ah(7,a|0)|0}function e$(a){a=a|0;return ah(8,a|0)|0}function e0(a){a=a|0;return ah(9,a|0)|0}function e1(a){a=a|0;return ah(10,a|0)|0}function e2(a){a=a|0;return ah(11,a|0)|0}function e3(a){a=a|0;return ah(12,a|0)|0}function e4(a){a=a|0;return ah(13,a|0)|0}function e5(a){a=a|0;return ah(14,a|0)|0}function e6(a){a=a|0;return ah(15,a|0)|0}function e7(a){a=a|0;return ah(16,a|0)|0}function e8(a){a=a|0;return ah(17,a|0)|0}function e9(a){a=a|0;return ah(18,a|0)|0}function fa(a){a=a|0;return ah(19,a|0)|0}function fb(a){a=a|0;return ah(20,a|0)|0}function fc(a){a=a|0;return ah(21,a|0)|0}function fd(a){a=a|0;return ah(22,a|0)|0}function fe(a){a=a|0;return ah(23,a|0)|0}function ff(a){a=a|0;return ah(24,a|0)|0}function fg(a){a=a|0;return ah(25,a|0)|0}function fh(a){a=a|0;return ah(26,a|0)|0}function fi(a){a=a|0;return ah(27,a|0)|0}function fj(a){a=a|0;return ah(28,a|0)|0}function fk(a){a=a|0;return ah(29,a|0)|0}function fl(a){a=a|0;return ah(30,a|0)|0}function fm(a){a=a|0;return ah(31,a|0)|0}function fn(a,b){a=a|0;b=b|0;bv[a&127](b|0)}function fo(a){a=a|0;ah(0,a|0)}function fp(a){a=a|0;ah(1,a|0)}function fq(a){a=a|0;ah(2,a|0)}function fr(a){a=a|0;ah(3,a|0)}function fs(a){a=a|0;ah(4,a|0)}function ft(a){a=a|0;ah(5,a|0)}function fu(a){a=a|0;ah(6,a|0)}function fv(a){a=a|0;ah(7,a|0)}function fw(a){a=a|0;ah(8,a|0)}function fx(a){a=a|0;ah(9,a|0)}function fy(a){a=a|0;ah(10,a|0)}function fz(a){a=a|0;ah(11,a|0)}function fA(a){a=a|0;ah(12,a|0)}function fB(a){a=a|0;ah(13,a|0)}function fC(a){a=a|0;ah(14,a|0)}function fD(a){a=a|0;ah(15,a|0)}function fE(a){a=a|0;ah(16,a|0)}function fF(a){a=a|0;ah(17,a|0)}function fG(a){a=a|0;ah(18,a|0)}function fH(a){a=a|0;ah(19,a|0)}function fI(a){a=a|0;ah(20,a|0)}function fJ(a){a=a|0;ah(21,a|0)}function fK(a){a=a|0;ah(22,a|0)}function fL(a){a=a|0;ah(23,a|0)}function fM(a){a=a|0;ah(24,a|0)}function fN(a){a=a|0;ah(25,a|0)}function fO(a){a=a|0;ah(26,a|0)}function fP(a){a=a|0;ah(27,a|0)}function fQ(a){a=a|0;ah(28,a|0)}function fR(a){a=a|0;ah(29,a|0)}function fS(a){a=a|0;ah(30,a|0)}function fT(a){a=a|0;ah(31,a|0)}function fU(a,b,c){a=a|0;b=b|0;c=c|0;bw[a&127](b|0,c|0)}function fV(a,b){a=a|0;b=b|0;ah(0,a|0,b|0)}function fW(a,b){a=a|0;b=b|0;ah(1,a|0,b|0)}function fX(a,b){a=a|0;b=b|0;ah(2,a|0,b|0)}function fY(a,b){a=a|0;b=b|0;ah(3,a|0,b|0)}function fZ(a,b){a=a|0;b=b|0;ah(4,a|0,b|0)}function f_(a,b){a=a|0;b=b|0;ah(5,a|0,b|0)}function f$(a,b){a=a|0;b=b|0;ah(6,a|0,b|0)}function f0(a,b){a=a|0;b=b|0;ah(7,a|0,b|0)}function f1(a,b){a=a|0;b=b|0;ah(8,a|0,b|0)}function f2(a,b){a=a|0;b=b|0;ah(9,a|0,b|0)}function f3(a,b){a=a|0;b=b|0;ah(10,a|0,b|0)}function f4(a,b){a=a|0;b=b|0;ah(11,a|0,b|0)}function f5(a,b){a=a|0;b=b|0;ah(12,a|0,b|0)}function f6(a,b){a=a|0;b=b|0;ah(13,a|0,b|0)}function f7(a,b){a=a|0;b=b|0;ah(14,a|0,b|0)}function f8(a,b){a=a|0;b=b|0;ah(15,a|0,b|0)}function f9(a,b){a=a|0;b=b|0;ah(16,a|0,b|0)}function ga(a,b){a=a|0;b=b|0;ah(17,a|0,b|0)}function gb(a,b){a=a|0;b=b|0;ah(18,a|0,b|0)}function gc(a,b){a=a|0;b=b|0;ah(19,a|0,b|0)}function gd(a,b){a=a|0;b=b|0;ah(20,a|0,b|0)}function ge(a,b){a=a|0;b=b|0;ah(21,a|0,b|0)}function gf(a,b){a=a|0;b=b|0;ah(22,a|0,b|0)}function gg(a,b){a=a|0;b=b|0;ah(23,a|0,b|0)}function gh(a,b){a=a|0;b=b|0;ah(24,a|0,b|0)}function gi(a,b){a=a|0;b=b|0;ah(25,a|0,b|0)}function gj(a,b){a=a|0;b=b|0;ah(26,a|0,b|0)}function gk(a,b){a=a|0;b=b|0;ah(27,a|0,b|0)}function gl(a,b){a=a|0;b=b|0;ah(28,a|0,b|0)}function gm(a,b){a=a|0;b=b|0;ah(29,a|0,b|0)}function gn(a,b){a=a|0;b=b|0;ah(30,a|0,b|0)}function go(a,b){a=a|0;b=b|0;ah(31,a|0,b|0)}function gp(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;return bx[a&127](b|0,c|0,d|0,e|0,f|0,g|0)|0}function gq(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(0,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gr(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(1,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gs(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(2,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gt(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(3,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gu(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(4,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gv(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(5,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gw(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(6,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gx(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(7,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gy(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(8,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gz(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(9,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gA(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(10,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gB(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(11,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gC(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(12,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gD(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(13,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gE(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(14,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gF(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(15,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gG(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(16,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gH(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(17,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gI(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(18,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gJ(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(19,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gK(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(20,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gL(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(21,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gM(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(22,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gN(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(23,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gO(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(24,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gP(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(25,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gQ(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(26,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gR(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(27,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gS(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(28,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gT(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(29,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gU(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(30,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gV(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return ah(31,a|0,b|0,c|0,d|0,e|0,f|0)|0}function gW(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;return by[a&127](b|0,c|0,d|0,e|0,f|0)|0}function gX(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(0,a|0,b|0,c|0,d|0,e|0)|0}function gY(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(1,a|0,b|0,c|0,d|0,e|0)|0}function gZ(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(2,a|0,b|0,c|0,d|0,e|0)|0}function g_(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(3,a|0,b|0,c|0,d|0,e|0)|0}function g$(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(4,a|0,b|0,c|0,d|0,e|0)|0}function g0(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(5,a|0,b|0,c|0,d|0,e|0)|0}function g1(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(6,a|0,b|0,c|0,d|0,e|0)|0}function g2(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(7,a|0,b|0,c|0,d|0,e|0)|0}function g3(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(8,a|0,b|0,c|0,d|0,e|0)|0}function g4(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(9,a|0,b|0,c|0,d|0,e|0)|0}function g5(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(10,a|0,b|0,c|0,d|0,e|0)|0}function g6(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(11,a|0,b|0,c|0,d|0,e|0)|0}function g7(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(12,a|0,b|0,c|0,d|0,e|0)|0}function g8(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(13,a|0,b|0,c|0,d|0,e|0)|0}function g9(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(14,a|0,b|0,c|0,d|0,e|0)|0}function ha(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(15,a|0,b|0,c|0,d|0,e|0)|0}function hb(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(16,a|0,b|0,c|0,d|0,e|0)|0}function hc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(17,a|0,b|0,c|0,d|0,e|0)|0}function hd(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(18,a|0,b|0,c|0,d|0,e|0)|0}function he(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(19,a|0,b|0,c|0,d|0,e|0)|0}function hf(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(20,a|0,b|0,c|0,d|0,e|0)|0}function hg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(21,a|0,b|0,c|0,d|0,e|0)|0}function hh(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(22,a|0,b|0,c|0,d|0,e|0)|0}function hi(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(23,a|0,b|0,c|0,d|0,e|0)|0}function hj(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(24,a|0,b|0,c|0,d|0,e|0)|0}function hk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(25,a|0,b|0,c|0,d|0,e|0)|0}function hl(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(26,a|0,b|0,c|0,d|0,e|0)|0}function hm(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(27,a|0,b|0,c|0,d|0,e|0)|0}function hn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(28,a|0,b|0,c|0,d|0,e|0)|0}function ho(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(29,a|0,b|0,c|0,d|0,e|0)|0}function hp(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(30,a|0,b|0,c|0,d|0,e|0)|0}function hq(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return ah(31,a|0,b|0,c|0,d|0,e|0)|0}function hr(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;bz[a&127](b|0,c|0,d|0)}function hs(a,b,c){a=a|0;b=b|0;c=c|0;ah(0,a|0,b|0,c|0)}function ht(a,b,c){a=a|0;b=b|0;c=c|0;ah(1,a|0,b|0,c|0)}function hu(a,b,c){a=a|0;b=b|0;c=c|0;ah(2,a|0,b|0,c|0)}function hv(a,b,c){a=a|0;b=b|0;c=c|0;ah(3,a|0,b|0,c|0)}function hw(a,b,c){a=a|0;b=b|0;c=c|0;ah(4,a|0,b|0,c|0)}function hx(a,b,c){a=a|0;b=b|0;c=c|0;ah(5,a|0,b|0,c|0)}function hy(a,b,c){a=a|0;b=b|0;c=c|0;ah(6,a|0,b|0,c|0)}function hz(a,b,c){a=a|0;b=b|0;c=c|0;ah(7,a|0,b|0,c|0)}function hA(a,b,c){a=a|0;b=b|0;c=c|0;ah(8,a|0,b|0,c|0)}function hB(a,b,c){a=a|0;b=b|0;c=c|0;ah(9,a|0,b|0,c|0)}function hC(a,b,c){a=a|0;b=b|0;c=c|0;ah(10,a|0,b|0,c|0)}function hD(a,b,c){a=a|0;b=b|0;c=c|0;ah(11,a|0,b|0,c|0)}function hE(a,b,c){a=a|0;b=b|0;c=c|0;ah(12,a|0,b|0,c|0)}function hF(a,b,c){a=a|0;b=b|0;c=c|0;ah(13,a|0,b|0,c|0)}function hG(a,b,c){a=a|0;b=b|0;c=c|0;ah(14,a|0,b|0,c|0)}function hH(a,b,c){a=a|0;b=b|0;c=c|0;ah(15,a|0,b|0,c|0)}function hI(a,b,c){a=a|0;b=b|0;c=c|0;ah(16,a|0,b|0,c|0)}function hJ(a,b,c){a=a|0;b=b|0;c=c|0;ah(17,a|0,b|0,c|0)}function hK(a,b,c){a=a|0;b=b|0;c=c|0;ah(18,a|0,b|0,c|0)}function hL(a,b,c){a=a|0;b=b|0;c=c|0;ah(19,a|0,b|0,c|0)}function hM(a,b,c){a=a|0;b=b|0;c=c|0;ah(20,a|0,b|0,c|0)}function hN(a,b,c){a=a|0;b=b|0;c=c|0;ah(21,a|0,b|0,c|0)}function hO(a,b,c){a=a|0;b=b|0;c=c|0;ah(22,a|0,b|0,c|0)}function hP(a,b,c){a=a|0;b=b|0;c=c|0;ah(23,a|0,b|0,c|0)}function hQ(a,b,c){a=a|0;b=b|0;c=c|0;ah(24,a|0,b|0,c|0)}function hR(a,b,c){a=a|0;b=b|0;c=c|0;ah(25,a|0,b|0,c|0)}function hS(a,b,c){a=a|0;b=b|0;c=c|0;ah(26,a|0,b|0,c|0)}function hT(a,b,c){a=a|0;b=b|0;c=c|0;ah(27,a|0,b|0,c|0)}function hU(a,b,c){a=a|0;b=b|0;c=c|0;ah(28,a|0,b|0,c|0)}function hV(a,b,c){a=a|0;b=b|0;c=c|0;ah(29,a|0,b|0,c|0)}function hW(a,b,c){a=a|0;b=b|0;c=c|0;ah(30,a|0,b|0,c|0)}function hX(a,b,c){a=a|0;b=b|0;c=c|0;ah(31,a|0,b|0,c|0)}function hY(a){a=a|0;bA[a&127]()}function hZ(){ah(0)}function h_(){ah(1)}function h$(){ah(2)}function h0(){ah(3)}function h1(){ah(4)}function h2(){ah(5)}function h3(){ah(6)}function h4(){ah(7)}function h5(){ah(8)}function h6(){ah(9)}function h7(){ah(10)}function h8(){ah(11)}function h9(){ah(12)}function ia(){ah(13)}function ib(){ah(14)}function ic(){ah(15)}function id(){ah(16)}function ie(){ah(17)}function ig(){ah(18)}function ih(){ah(19)}function ii(){ah(20)}function ij(){ah(21)}function ik(){ah(22)}function il(){ah(23)}function im(){ah(24)}function io(){ah(25)}function ip(){ah(26)}function iq(){ah(27)}function ir(){ah(28)}function is(){ah(29)}function it(){ah(30)}function iu(){ah(31)}function iv(a,b,c){a=a|0;b=b|0;c=c|0;return bB[a&127](b|0,c|0)|0}function iw(a,b){a=a|0;b=b|0;return ah(0,a|0,b|0)|0}function ix(a,b){a=a|0;b=b|0;return ah(1,a|0,b|0)|0}function iy(a,b){a=a|0;b=b|0;return ah(2,a|0,b|0)|0}function iz(a,b){a=a|0;b=b|0;return ah(3,a|0,b|0)|0}function iA(a,b){a=a|0;b=b|0;return ah(4,a|0,b|0)|0}function iB(a,b){a=a|0;b=b|0;return ah(5,a|0,b|0)|0}function iC(a,b){a=a|0;b=b|0;return ah(6,a|0,b|0)|0}function iD(a,b){a=a|0;b=b|0;return ah(7,a|0,b|0)|0}function iE(a,b){a=a|0;b=b|0;return ah(8,a|0,b|0)|0}function iF(a,b){a=a|0;b=b|0;return ah(9,a|0,b|0)|0}function iG(a,b){a=a|0;b=b|0;return ah(10,a|0,b|0)|0}function iH(a,b){a=a|0;b=b|0;return ah(11,a|0,b|0)|0}function iI(a,b){a=a|0;b=b|0;return ah(12,a|0,b|0)|0}function iJ(a,b){a=a|0;b=b|0;return ah(13,a|0,b|0)|0}function iK(a,b){a=a|0;b=b|0;return ah(14,a|0,b|0)|0}function iL(a,b){a=a|0;b=b|0;return ah(15,a|0,b|0)|0}function iM(a,b){a=a|0;b=b|0;return ah(16,a|0,b|0)|0}function iN(a,b){a=a|0;b=b|0;return ah(17,a|0,b|0)|0}function iO(a,b){a=a|0;b=b|0;return ah(18,a|0,b|0)|0}function iP(a,b){a=a|0;b=b|0;return ah(19,a|0,b|0)|0}function iQ(a,b){a=a|0;b=b|0;return ah(20,a|0,b|0)|0}function iR(a,b){a=a|0;b=b|0;return ah(21,a|0,b|0)|0}function iS(a,b){a=a|0;b=b|0;return ah(22,a|0,b|0)|0}function iT(a,b){a=a|0;b=b|0;return ah(23,a|0,b|0)|0}function iU(a,b){a=a|0;b=b|0;return ah(24,a|0,b|0)|0}function iV(a,b){a=a|0;b=b|0;return ah(25,a|0,b|0)|0}function iW(a,b){a=a|0;b=b|0;return ah(26,a|0,b|0)|0}function iX(a,b){a=a|0;b=b|0;return ah(27,a|0,b|0)|0}function iY(a,b){a=a|0;b=b|0;return ah(28,a|0,b|0)|0}function iZ(a,b){a=a|0;b=b|0;return ah(29,a|0,b|0)|0}function i_(a,b){a=a|0;b=b|0;return ah(30,a|0,b|0)|0}function i$(a,b){a=a|0;b=b|0;return ah(31,a|0,b|0)|0}function i0(a){a=a|0;ac(0);return 0}function i1(a){a=a|0;ac(1)}function i2(a,b){a=a|0;b=b|0;ac(2)}function i3(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;ac(3);return 0}function i4(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;ac(4);return 0}function i5(a,b,c){a=a|0;b=b|0;c=c|0;ac(5)}function i6(){ac(6)}function i7(a,b){a=a|0;b=b|0;ac(7);return 0}
// EMSCRIPTEN_END_FUNCS
var bu=[i0,i0,eT,i0,eU,i0,eV,i0,eW,i0,eX,i0,eY,i0,eZ,i0,e_,i0,e$,i0,e0,i0,e1,i0,e2,i0,e3,i0,e4,i0,e5,i0,e6,i0,e7,i0,e8,i0,e9,i0,fa,i0,fb,i0,fc,i0,fd,i0,fe,i0,ff,i0,fg,i0,fh,i0,fi,i0,fj,i0,fk,i0,fl,i0,fm,i0,ep,i0,es,i0,dP,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0,i0];var bv=[i1,i1,fo,i1,fp,i1,fq,i1,fr,i1,fs,i1,ft,i1,fu,i1,fv,i1,fw,i1,fx,i1,fy,i1,fz,i1,fA,i1,fB,i1,fC,i1,fD,i1,fE,i1,fF,i1,fG,i1,fH,i1,fI,i1,fJ,i1,fK,i1,fL,i1,fM,i1,fN,i1,fO,i1,fP,i1,fQ,i1,fR,i1,fS,i1,fT,i1,eq,i1,er,i1,dQ,i1,eo,i1,em,i1,en,i1,cl,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1,i1];var bw=[i2,i2,fV,i2,fW,i2,fX,i2,fY,i2,fZ,i2,f_,i2,f$,i2,f0,i2,f1,i2,f2,i2,f3,i2,f4,i2,f5,i2,f6,i2,f7,i2,f8,i2,f9,i2,ga,i2,gb,i2,gc,i2,gd,i2,ge,i2,gf,i2,gg,i2,gh,i2,gi,i2,gj,i2,gk,i2,gl,i2,gm,i2,gn,i2,go,i2,eB,i2,eF,i2,eC,i2,eG,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2,i2];var bx=[i3,i3,gq,i3,gr,i3,gs,i3,gt,i3,gu,i3,gv,i3,gw,i3,gx,i3,gy,i3,gz,i3,gA,i3,gB,i3,gC,i3,gD,i3,gE,i3,gF,i3,gG,i3,gH,i3,gI,i3,gJ,i3,gK,i3,gL,i3,gM,i3,gN,i3,gO,i3,gP,i3,gQ,i3,gR,i3,gS,i3,gT,i3,gU,i3,gV,i3,cm,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3,i3];var by=[i4,i4,gX,i4,gY,i4,gZ,i4,g_,i4,g$,i4,g0,i4,g1,i4,g2,i4,g3,i4,g4,i4,g5,i4,g6,i4,g7,i4,g8,i4,g9,i4,ha,i4,hb,i4,hc,i4,hd,i4,he,i4,hf,i4,hg,i4,hh,i4,hi,i4,hj,i4,hk,i4,hl,i4,hm,i4,hn,i4,ho,i4,hp,i4,hq,i4,co,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4,i4];var bz=[i5,i5,hs,i5,ht,i5,hu,i5,hv,i5,hw,i5,hx,i5,hy,i5,hz,i5,hA,i5,hB,i5,hC,i5,hD,i5,hE,i5,hF,i5,hG,i5,hH,i5,hI,i5,hJ,i5,hK,i5,hL,i5,hM,i5,hN,i5,hO,i5,hP,i5,hQ,i5,hR,i5,hS,i5,hT,i5,hU,i5,hV,i5,hW,i5,hX,i5,eE,i5,ez,i5,eD,i5,eA,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5,i5];var bA=[i6,i6,hZ,i6,h_,i6,h$,i6,h0,i6,h1,i6,h2,i6,h3,i6,h4,i6,h5,i6,h6,i6,h7,i6,h8,i6,h9,i6,ia,i6,ib,i6,ic,i6,id,i6,ie,i6,ig,i6,ih,i6,ii,i6,ij,i6,ik,i6,il,i6,im,i6,io,i6,ip,i6,iq,i6,ir,i6,is,i6,it,i6,iu,i6,eR,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6,i6];var bB=[i7,i7,iw,i7,ix,i7,iy,i7,iz,i7,iA,i7,iB,i7,iC,i7,iD,i7,iE,i7,iF,i7,iG,i7,iH,i7,iI,i7,iJ,i7,iK,i7,iL,i7,iM,i7,iN,i7,iO,i7,iP,i7,iQ,i7,iR,i7,iS,i7,iT,i7,iU,i7,iV,i7,iW,i7,iX,i7,iY,i7,iZ,i7,i_,i7,i$,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7,i7];return{_jsapi_enet_host_create:bU,_jsapi_enet_host_create_client:bV,_strlen:eP,_enet_peer_ping:cT,_enet_packet_destroy:cE,_enet_peer_reset:cS,_enet_host_destroy:cr,_enet_host_flush:c3,_jsapi_peer_get_address:cd,_calloc:dR,_strncpy:eQ,_memset:eN,_memcpy:eO,_jsapi_event_get_peer:b_,_enet_peer_disconnect_now:cW,_jsapi_packet_set_free_callback:b6,_jsapi_event_new:bX,_realloc:dS,_enet_host_service:c7,_jsapi_event_free:bY,_jsapi_init:bT,_jsapi_event_get_data:b1,_jsapi_host_get_socket:cc,_enet_peer_send:cM,_jsapi_packet_get_dataLength:b5,_enet_peer_disconnect:cX,_jsapi_address_get_port:b3,_jsapi_host_get_receivedAddress:b7,_enet_packet_create:cD,_jsapi_enet_host_connect:bW,_free:dQ,_jsapi_event_get_channelID:b$,_jsapi_address_get_host:b2,_enet_peer_disconnect_later:cY,_malloc:dP,_jsapi_event_get_packet:b0,_jsapi_event_get_type:bZ,_jsapi_packet_get_data:b4,runPostSets:bS,stackAlloc:bC,stackSave:bD,stackRestore:bE,setThrew:bF,setTempRet0:bI,setTempRet1:bJ,setTempRet2:bK,setTempRet3:bL,setTempRet4:bM,setTempRet5:bN,setTempRet6:bO,setTempRet7:bP,setTempRet8:bQ,setTempRet9:bR,dynCall_ii:eS,dynCall_vi:fn,dynCall_vii:fU,dynCall_iiiiiii:gp,dynCall_iiiiii:gW,dynCall_viii:hr,dynCall_v:hY,dynCall_iii:iv}})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "jsCall": jsCall, "invoke_ii": invoke_ii, "invoke_vi": invoke_vi, "invoke_vii": invoke_vii, "invoke_iiiiiii": invoke_iiiiiii, "invoke_iiiiii": invoke_iiiiii, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_iii": invoke_iii, "_strncmp": _strncmp, "_llvm_va_end": _llvm_va_end, "_htonl": _htonl, "_sysconf": _sysconf, "__inet_pton4_raw": __inet_pton4_raw, "___cxa_throw": ___cxa_throw, "_inet_ntop6_raw": _inet_ntop6_raw, "_accept": _accept, "___gxx_personality_v0": ___gxx_personality_v0, "_abort": _abort, "_fprintf": _fprintf, "_connect": _connect, "_shutdown": _shutdown, "_close": _close, "_inet_pton6_raw": _inet_pton6_raw, "_fflush": _fflush, "_htons": _htons, "_strchr": _strchr, "_fputc": _fputc, "___buildEnvironment": ___buildEnvironment, "_puts": _puts, "___setErrNo": ___setErrNo, "_fwrite": _fwrite, "___cxa_free_exception": ___cxa_free_exception, "_inet_addr": _inet_addr, "_send": _send, "_write": _write, "_fputs": _fputs, "_recvmsg": _recvmsg, "_select": _select, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "_inet_aton": _inet_aton, "_gethostbyaddr": _gethostbyaddr, "_listen": _listen, "_exit": _exit, "_setsockopt": _setsockopt, "___cxa_is_number_type": ___cxa_is_number_type, "__reallyNegative": __reallyNegative, "___cxa_allocate_exception": ___cxa_allocate_exception, "__formatString": __formatString, "___cxa_does_inherit": ___cxa_does_inherit, "_getenv": _getenv, "_gethostbyname": _gethostbyname, "_gettimeofday": _gettimeofday, "_vfprintf": _vfprintf, "___cxa_begin_catch": ___cxa_begin_catch, "_inet_ntoa_raw": _inet_ntoa_raw, "_inet_ntoa": _inet_ntoa, "_llvm_eh_exception": _llvm_eh_exception, "_recv": _recv, "__inet_ntop4_raw": __inet_ntop4_raw, "_pwrite": _pwrite, "_perror": _perror, "_socket": _socket, "_sbrk": _sbrk, "_strerror_r": _strerror_r, "_bind": _bind, "___errno_location": ___errno_location, "_strerror": _strerror, "_isspace": _isspace, "_recvfrom": _recvfrom, "___cxa_call_unexpected": ___cxa_call_unexpected, "_time": _time, "__exit": __exit, "___resumeException": ___resumeException, "_sendmsg": _sendmsg, "___cxa_end_catch": ___cxa_end_catch, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity, "_stderr": _stderr, "__ZTVN10__cxxabiv120__si_class_type_infoE": __ZTVN10__cxxabiv120__si_class_type_infoE, "__ZTVN10__cxxabiv117__class_type_infoE": __ZTVN10__cxxabiv117__class_type_infoE, "___progname": ___progname }, buffer);
var _jsapi_enet_host_create = Module["_jsapi_enet_host_create"] = asm["_jsapi_enet_host_create"];
var _jsapi_enet_host_create_client = Module["_jsapi_enet_host_create_client"] = asm["_jsapi_enet_host_create_client"];
var _strlen = Module["_strlen"] = asm["_strlen"];
var _enet_peer_ping = Module["_enet_peer_ping"] = asm["_enet_peer_ping"];
var _enet_packet_destroy = Module["_enet_packet_destroy"] = asm["_enet_packet_destroy"];
var _enet_peer_reset = Module["_enet_peer_reset"] = asm["_enet_peer_reset"];
var _enet_host_destroy = Module["_enet_host_destroy"] = asm["_enet_host_destroy"];
var _enet_host_flush = Module["_enet_host_flush"] = asm["_enet_host_flush"];
var _jsapi_peer_get_address = Module["_jsapi_peer_get_address"] = asm["_jsapi_peer_get_address"];
var _calloc = Module["_calloc"] = asm["_calloc"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _memset = Module["_memset"] = asm["_memset"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _jsapi_event_get_peer = Module["_jsapi_event_get_peer"] = asm["_jsapi_event_get_peer"];
var _enet_peer_disconnect_now = Module["_enet_peer_disconnect_now"] = asm["_enet_peer_disconnect_now"];
var _jsapi_packet_set_free_callback = Module["_jsapi_packet_set_free_callback"] = asm["_jsapi_packet_set_free_callback"];
var _jsapi_event_new = Module["_jsapi_event_new"] = asm["_jsapi_event_new"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _enet_host_service = Module["_enet_host_service"] = asm["_enet_host_service"];
var _jsapi_event_free = Module["_jsapi_event_free"] = asm["_jsapi_event_free"];
var _jsapi_init = Module["_jsapi_init"] = asm["_jsapi_init"];
var _jsapi_event_get_data = Module["_jsapi_event_get_data"] = asm["_jsapi_event_get_data"];
var _jsapi_host_get_socket = Module["_jsapi_host_get_socket"] = asm["_jsapi_host_get_socket"];
var _enet_peer_send = Module["_enet_peer_send"] = asm["_enet_peer_send"];
var _jsapi_packet_get_dataLength = Module["_jsapi_packet_get_dataLength"] = asm["_jsapi_packet_get_dataLength"];
var _enet_peer_disconnect = Module["_enet_peer_disconnect"] = asm["_enet_peer_disconnect"];
var _jsapi_address_get_port = Module["_jsapi_address_get_port"] = asm["_jsapi_address_get_port"];
var _jsapi_host_get_receivedAddress = Module["_jsapi_host_get_receivedAddress"] = asm["_jsapi_host_get_receivedAddress"];
var _enet_packet_create = Module["_enet_packet_create"] = asm["_enet_packet_create"];
var _jsapi_enet_host_connect = Module["_jsapi_enet_host_connect"] = asm["_jsapi_enet_host_connect"];
var _free = Module["_free"] = asm["_free"];
var _jsapi_event_get_channelID = Module["_jsapi_event_get_channelID"] = asm["_jsapi_event_get_channelID"];
var _jsapi_address_get_host = Module["_jsapi_address_get_host"] = asm["_jsapi_address_get_host"];
var _enet_peer_disconnect_later = Module["_enet_peer_disconnect_later"] = asm["_enet_peer_disconnect_later"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _jsapi_event_get_packet = Module["_jsapi_event_get_packet"] = asm["_jsapi_event_get_packet"];
var _jsapi_event_get_type = Module["_jsapi_event_get_type"] = asm["_jsapi_event_get_type"];
var _jsapi_packet_get_data = Module["_jsapi_packet_get_data"] = asm["_jsapi_packet_get_data"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}
Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  try {
    var ret = Module['_main'](argc, argv, 0);
    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || Module['arguments'];
  if (preloadStartTime === null) preloadStartTime = Date.now();
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }
  preRun();
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    Module['calledRun'] = true;
    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }
    postRun();
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;
function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  // exit the runtime
  exitRuntime();
  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371
  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;
function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }
  ABORT = true;
  EXITSTATUS = 1;
  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;
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
}).call(moduleScope);

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
