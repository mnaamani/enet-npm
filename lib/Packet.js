var Buffer = require("buffer").Buffer;
var ENETModule = require("../build/enet.js");
var enet = require("../index.js");

var jsapi_ = ENETModule.jsapi;
var enet_ = ENETModule.libenet;

module.exports.Packet = Packet;

function Packet() {
	var packet = this;

	var buf, flags;

	//packet from pointer
	if (arguments.length === 1 && typeof arguments[0] === 'number') {
		packet._pointer = arguments[0];
		return packet;
	}

	//packet from buffer
	if (arguments.length > 0 && typeof arguments[0] === 'object') {
		//construct a new packet from node buffer
		buf = arguments[0];

		if (typeof arguments[1] === 'number') {
			flags = arguments[1];
		}

		flags = flags || 0; //defaults to unreliable packet

		packet._packetFromBuffer(buf, flags);

		return packet;
	}

	//packet from string
	if (arguments.length > 0 && typeof arguments[0] == 'string') {
		return new Packet(new Buffer(arguments[0]), arguments[1]);
	}
}

Packet.prototype._packetFromBuffer = function (buf, flags) {
	var packet = this,
		begin, end, c, i;
	packet._pointer = enet_.packet_create(0, buf.length, flags);
	if (!packet._pointer) return; //no memory allocated for packet
	begin = jsapi_.packet_get_data(packet._pointer);
	end = begin + buf.length;
	c = 0;
	i = begin;
	for (; i < end; i++, c++) {
		ENETModule["HEAPU8"][i] = buf.readUInt8(c);
	}
};

Packet.prototype._attachFreeCallback = function (free_ptr) {
	jsapi_.packet_set_free_callback(this._pointer, free_ptr);
};

Packet.prototype.flags = function () {
	if (!this._pointer) return 0;
	return jsapi_.packet_flags(this._pointer);
};

Packet.prototype.wasSent = function () {
	return ((this.flags() & enet.PACKET_FLAG.SENT) == enet.PACKET_FLAG.SENT);
};

Packet.prototype.data = function () {
	var begin, end;
	if (!this._pointer) return undefined;
	begin = jsapi_.packet_get_data(this._pointer);
	end = begin + jsapi_.packet_get_dataLength(this._pointer);
	return new Buffer(ENETModule["HEAPU8"].subarray(begin, end), "byte");
	//return HEAPU8.subarray(begin,end);
};

Packet.prototype.dataLength = function () {
	if (!this._pointer) return 0;
	return jsapi_.packet_get_dataLength(this._pointer);
};

Packet.prototype.destroy = function () {
	if (!this._pointer) return;
	enet_.packet_destroy(this._pointer);
	this._pointer = 0;
};
