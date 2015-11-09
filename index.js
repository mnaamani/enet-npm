var ENETModule = require("./build/enet.js");

var jsapi_ = ENETModule.jsapi;

var enet = module.exports = {};

enet.Host = require("./lib/Host.js").Host;
enet.createServer = require("./lib/Host.js").createServer;
enet.createClient = require("./lib/Host.js").createClient;
enet.createServerFromSocket = require("./lib/Host.js").createServerFromSocket;
enet.Event = require("./lib/Event.js").Event;
enet.Address = require("./lib/Address.js").Address;
enet.Packet = require("./lib/Packet.js").Packet;
enet.Peer = require("./lib/Peer.js").Peer;
enet.Buffer = require("buffer").Buffer; //for use in chrome app when creating packets
enet.PACKET_FLAG = require("./lib/PACKET_FLAG.js").PACKET_FLAG;
enet.PEER_STATE = require("./lib/PEER_STATE.js").PEER_STATE;

enet.init = function (func) {
	var funcPointer = ENETModule["Runtime_addFunction"](function (host_ptr) {
		var addr = new enet.Address(jsapi_.host_get_receivedAddress(host_ptr));
		return func(addr.address(), addr.port());
	});
	jsapi_.init(funcPointer);
};

