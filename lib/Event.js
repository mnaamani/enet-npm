var ENETModule = require("../build/enet.js");
var enet = require("../index.js");

var jsapi_ = ENETModule.jsapi;

module.exports.Event = Event;

function Event() {
	this._pointer = jsapi_.event_new();
}

Event.prototype.free = function () {
	jsapi_.event_free(this._pointer);
};

Event.prototype.type = function () {
	return jsapi_.event_get_type(this._pointer);
};
Event.prototype.peer = function () {
	var ptr = jsapi_.event_get_peer(this._pointer);
	return new enet.Peer(ptr);
};
Event.prototype.peerPtr = function () {
	return jsapi_.event_get_peer(this._pointer);
};
Event.prototype.packet = function () {
	var ptr = jsapi_.event_get_packet(this._pointer);
	return new enet.Packet(ptr);
};
Event.prototype.data = function () {
	return jsapi_.event_get_data(this._pointer);
};
Event.prototype.channelID = function () {
	return jsapi_.event_get_channelID(this._pointer);
};
