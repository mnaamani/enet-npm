var Buffer = require("buffer").Buffer;
var events = require("events");
var util = require("util");
var Stream = require("stream");
var ENETModule = require("../build/enet.js");
var enet = require("../index.js");

var jsapi_ = ENETModule.jsapi;
var enet_ = ENETModule.libenet;

util.inherits(Peer, events.EventEmitter);

module.exports.Peer = Peer;

function Peer(pointer) {
	var peer = this;
	if (!pointer || !(typeof pointer === 'number') || pointer === 0) throw ("Peer null pointer");
	peer._pointer = pointer;
	events.EventEmitter.call(peer);
	peer.setMaxListeners(0);
}

Peer.prototype.state = function () {
	if (this._pointer) {
		return jsapi_.peer_get_state(this._pointer);
	}
	return enet.PEER_STATE.DISCONNECTED;
};

Peer.prototype.incomingDataTotal = function () {
	if (this._pointer) {
		return jsapi_.peer_get_incomingDataTotal(this._pointer);
	}
	return 0;
};

Peer.prototype.outgoingDataTotal = function () {
	if (this._pointer) {
		return jsapi_.peer_get_outgoingDataTotal(this._pointer);
	}
	return 0;
};

Peer.prototype.reliableDataInTransit = function () {
	if (!this._pointer) return 0;
	return jsapi._peer_get_reliableDataInTransit(this._pointer);
};

Peer.prototype.send = function (channel, packet, callback) {
	var peer = this;
	if (peer._host.isOffline()) {
		if (typeof callback === 'function') callback(new Error("host-destroyed"));
		return true;
	}

	if (!peer._pointer) {
		if (typeof callback === 'function') callback(new Error("Peer is disconnected"));
		return true;
	}

	if (!(packet instanceof enet.Packet)) packet = new enet.Packet(packet, enet.PACKET_FLAG.RELIABLE);

	if (!packet._pointer || packet._pointer == 0) {
		if (typeof callback === 'function') callback(new Error("null packet"));
		return true;
	}

	if (typeof callback === 'function') {
		peer._host._addPacketCallback(packet, callback);
	}

	if (enet_.peer_send(peer._pointer, channel, packet._pointer) !== 0) {
		if (typeof callback === 'function') callback(new Error('Packet not queued'));
		return true; //packet not queued - error
	}

	return false; //packed queued - no error
};

Peer.prototype._delete = function (emitDisconnect, disconnectData) {
	var peer = this;
	if (!peer._pointer) return;
	if (peer._host) delete peer._host.connectedPeers[peer._pointer];
	peer._pointer = 0;
	if (emitDisconnect) peer.emit("disconnect", disconnectData);
};

Peer.prototype.reset = function () {
	var peer = this;
	if (peer._pointer) {
		enet_.peer_reset(this._pointer);
		peer._delete(false);
	}
	return peer;
};

Peer.prototype.ping = function () {
	var peer = this;
	if (peer._pointer) enet_.peer_ping(peer._pointer);
	return peer;
};

Peer.prototype.disconnect = function (data) {
	var peer = this;
	if (peer._pointer) {
		enet_.peer_disconnect(peer._pointer, data || 0);
	}
	return peer;
};

Peer.prototype.disconnectNow = function (data) {
	var peer = this;
	if (peer._pointer) {
		enet_.peer_disconnect_now(peer._pointer, data || 0);
		peer._delete(true);
	}
	return peer;
};

Peer.prototype.disconnectLater = function (data) {
	var peer = this;
	if (peer._pointer) {
		enet_.peer_disconnect_later(peer._pointer, data || 0);
	}
	return peer;
};

Peer.prototype.address = function () {
	var peer = this;
	if (!peer._pointer) {
		if (peer._address) return peer._address;
		return;
	}
	var ptr = jsapi_.peer_get_address(peer._pointer);
	var addr = new enet.Address(ptr);
	//save the address so we can check it after disconnect
	peer._address = {
		address: addr.address(),
		port: addr.port()
	};
	return peer._address;
};

//turn a channel with peer into a node writeable Stream
//ref: https://github.com/substack/stream-handbook

//todo - for stream, some additional error checking - make sure channel is a number
//and not larger than the number of channels supported by peer. Dont allow creating
//allow more than one write/readable stream for same channel?

Peer.prototype.createWriteStream = function (channel) {
	var peer = this;
	if (!peer._pointer) return;

	var connected = (peer.state() === enet.PEER_STATE.CONNECTED);
	var error = false;

	var s = new Stream.Writable();

	peer.on("connect", function () {
		connected = true;
	});

	peer.on("disconnect", function (data) {
		connected = false;
	});

	s._write = function (buf, enc, next) {
		if (!connected) {
			next("peer-not-connected");
			return;
		}

		if (error) {
			next("packet-queuing-error");
			return;
		}

		var packet = new enet.Packet(buf, enet.PACKET_FLAG.RELIABLE);

		error = peer.send(channel, packet);

		if (error) {
			next("packet-queuing-error");
			return;
		}

		next();
	};

	return s;
};

Peer.prototype.createReadStream = function (channel) {
	var peer = this;
	if (!peer._pointer) return;

	var s = new Stream.Readable();

	var connected = (peer.state() === enet.PEER_STATE.CONNECTED);

	peer.on("connect", function () {
		connected = true;
	});

	peer.on("disconnect", function (data) {
		connected = false;
		s.push(null); //signals end of data
	});

	peer.on("message", function (_packet, _channel) {
		if (channel === _channel) {
			s.push(_packet.data());
		}
	});

	s._read = function (size) {
		if (!connected) s.push(null);
	};

	return s;

};

Peer.prototype.createDuplexStream = function (channel) {
	var peer = this;
	if (!peer._pointer) return;

	var s = new Stream.Duplex();
	var error = false;

	var connected = (peer.state() === enet.PEER_STATE.CONNECTED);

	peer.on("connect", function () {
		connected = true;
	});

	peer.on("disconnect", function (data) {
		connected = false;
		s.push(null); //signals end of data
	});

	s._write = function (buf, enc, next) {
		if (!connected) {
			next("peer-not-connected");
			return;
		}

		if (error) {
			next("packet-queuing-error");
			return;
		}

		var packet = new enet.Packet(buf, enet.PACKET_FLAG.RELIABLE);

		error = peer.send(channel, packet);

		if (error) {
			next("packet-queuing-error");
			return;
		}

		next();
	};

	peer.on("message", function (_packet, _channel) {
		if (channel === _channel) {
			s.push(_packet.data());
		}
	});

	s._read = function (size) {
		if (!connected) s.push(null);
	};

	return s;
};
