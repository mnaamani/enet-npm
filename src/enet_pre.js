var Buffer = require("buffer").Buffer;
var events = require("events");
var util = require("util");
var Stream = require("stream");

var jsapi_ = {};
var enet_ = {};

var Module = {};
var ENetSockets = {};

Module["preRun"]=[];

Module['preRun'].push(function(){
        ENetSockets.packetFilter = (function(){
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

        __packet_filter = function(host_ptr){
           var addr = new ENetAddress(jsapi_.host_get_receivedAddress(host_ptr));
           return ENetSockets.packetFilter.apply(addr.address(),addr.port());
        }
});
