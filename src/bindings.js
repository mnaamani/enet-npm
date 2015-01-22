var Buffer = require("buffer").Buffer;
var events = require("events");
var util = require("util");
var Stream = require("stream");

var ENETModule = moduleScope.Module;
var jsapi_ = moduleScope.Module.jsapi;
var enet_ = moduleScope.Module.libenet;

var ENET_HOST_SERVICE_INTERVAL = 30; //milliseconds
var ENET_PACKET_FLAG_RELIABLE = 1;

module.exports.init = function (func) {
	var funcPointer = ENETModule["Runtime_addFunction"](function (host_ptr) {
		var addr = new ENetAddress(jsapi_.host_get_receivedAddress(host_ptr));
		return func(addr.address(), addr.port());
	});
	jsapi_.init(funcPointer);
};

module.exports.Host = ENetHost;
module.exports.Address = ENetAddress;
module.exports.Packet = ENetPacket;
module.exports.inet_ip2long = ip2long;
module.exports.inet_long2ip = long2ip;

util.inherits(ENetHost, events.EventEmitter);
util.inherits(ENetPacket, events.EventEmitter);
util.inherits(ENetPeer, events.EventEmitter);

function createHost(arg, callback, host_type) {
	var host, socket;

	try {
		host = new ENetHost(arg.address, arg.peers, arg.channels, arg.down, arg.up, host_type);
		socket = host._socket;

		if (!socket) {
			callback(new Error("socket-creation-error"));
			return;
		}

		socket.on("error", function (e) {
			host.destroy();
			if (host_type === "server") {
				callback(e);
			} else {
				host.emit("error", e);
			}
		});

		socket.on("close", function () {
			host._socket_closed = true;
			host.destroy();
		});

		if (host_type === "client") host.start();

		if (host_type === "client" || socket._bound || socket.__receiving) {
			setTimeout(function () {
				if (socket._bound || socket.__receiving) socket.setBroadcast(true);
				callback(undefined, host);
			}, 20);
		} else {
			socket.on("listening", function () {
				socket.setBroadcast(true);
				callback(undefined, host);
			});
		}

	} catch (e) {
		callback(e);
		return;
	}
}

module.exports.createServer = function (arg, callback) {

	//server must provide an ENetAddress to be able to accept incomig connections
	if (!arg || !arg.address) {
		callback(new Error("no-address"));
		return;
	}

	createHost(arg, callback, "server");
};

module.exports.createClient = function (arg, callback) {
	var opt = {
		peers: 32,
		channels: 5,
		down: 0,
		up: 0
	};

	if (typeof arg === "function") {
		callback = arg;
	} else opt = arg;

	//make sure no address is included so enet will treat host as a client and not accept incoming connections
	delete opt.address;

	createHost(opt, callback, "client");
};

function ENetHost(address, maxpeers, maxchannels, bw_down, bw_up, host_type) {
	events.EventEmitter.call(this);
	this.setMaxListeners(0);
	this.connectedPeers = {};
	var enetAddr;
	var self = this;
	var pointer = 0;

	//ENetHost from pointer
	if (arguments.length === 1 && (typeof address === 'number')) {
		pointer = address;
		self._pointer = pointer;
		self._event = new ENetEvent();
		return self;
	}

	if (host_type === 'client') {
		pointer = jsapi_.enet_host_create_client(maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up || 0);

	} else { //default is a server
		enetAddr = (address instanceof ENetAddress) ? address : new ENetAddress(address);
		pointer = jsapi_.enet_host_create(enetAddr.host(), enetAddr.port(), maxpeers || 128, maxchannels || 5,
			bw_down || 0,
			bw_up || 0);
	}

	if (pointer === 0) {
		throw ('failed to create ENet host');
	}
	self._event = new ENetEvent(); //allocate memory for events - free it when we destroy the host
	self._pointer = pointer;
	var socketfd = jsapi_.host_get_socket(self._pointer);
	self._socket = ENETModule["GetSocket"](socketfd);
}

ENetHost.prototype.isOffline = function () {
	return (typeof this._pointer === "undefined" || this._pointer === 0 || this._shutting_down || this._socket_closed);
};

ENetHost.prototype.isOnline = function () {
	return (this.isOffline() === false);
};

ENetHost.prototype._service = function () {
	var self = this;
	var peer;
	var recvdAddr;

	if (!self._pointer || !self._event || self._socket_closed) return;

	var err = enet_.host_service(self._pointer, self._event._pointer, 0);
	while (err > 0) {
		switch (self._event.type()) {
		case 0: //none
			break;
		case 1: //connect
			peer = self.connectedPeers[self._event.peerPtr()];
			if (peer) {
				//outgoing connection
				peer.emit("connect");
				self.emit("connect",
					peer,
					undefined,
					true //local host initiated the connection to foriegn host
				);
			} else {
				peer = self.connectedPeers[self._event.peerPtr()] = self._event.peer();
				peer._host = self;
				//incoming connection
				self.emit("connect",
					peer,
					self._event.data(),
					false //foreign host initiated connection to local host
				);
			}
			break;
		case 2: //disconnect
			peer = self.connectedPeers[self._event.peerPtr()];
			if (peer) {
				delete self.connectedPeers[self._event.peerPtr()];
				peer._pointer = 0;
				peer.emit("disconnect", self._event.data());
			}
			break;
		case 3: //receive
			peer = self.connectedPeers[self._event.peerPtr()] || self._event.peer();
			self.emit("message",
				peer,
				self._event.packet(),
				self._event.channelID()
			);
			peer.emit("message", self._event.packet(), self._event.channelID());
			self._event.packet().destroy();
			break;
		case 100: //JSON,telex
			recvdAddr = self.receivedAddress();
			self.emit("telex",
				self._event.packet().data(), {
					'address': recvdAddr.address,
					'port': recvdAddr.port
				}
			);
			self._event.packet().destroy();
			break;
		}
		if (!self._pointer || !self._event || self._socket_closed) return;
		err = enet_.host_service(self._pointer, self._event._pointer, 0);
	}

	if (err < 0) console.error("Error servicing host: ", err);

};

ENetHost.prototype.destroy = function () {
	var self = this;
	var peer, peer_ptr;
	if (self._shutting_down) return;
	self._shutting_down = true;

	if (self._io_loop) {
		clearInterval(self._io_loop);
	}
	if (typeof self._pointer === 'undefined' || self._pointer === 0) return;

	for (peer_ptr in self.connectedPeers) {
		peer = self.connectedPeers[peer_ptr];
		if (peer._pointer !== 0) {
			if (!self._socket_closed) enet_.peer_disconnect_now(peer_ptr, 0);
			peer._pointer = 0;
			peer.emit("disconnect", 0);
		}
	}
	delete self.connectedPeers;

	if (self._event) self._event.free();

	try {
		if (self._pointer) enet_.host_destroy(this._pointer);
	} catch (e) {}

	delete self._pointer;
	delete self._event;
	delete self._io_loop;
	delete self._socket;
	self.emit("destroy");
};

ENetHost.prototype.receivedAddress = function () {
	if (this.isOffline()) return;
	var ptr = jsapi_.host_get_receivedAddress(this._pointer);
	var addr = new ENetAddress(ptr);
	return ({
		address: addr.address(),
		port: addr.port()
	});
};

ENetHost.prototype.address = function () {
	if (this.isOffline()) return;
	return this._socket.address();
};
ENetHost.prototype.send = function (ip, port, buff, callback) {
	if (this.isOffline()) return;
	this._socket.send(buff, 0, buff.length, port, ip, callback);
};
ENetHost.prototype.flush = function () {
	if (this.isOffline()) return;
	enet_.host_flush(this._pointer);
};

ENetHost.prototype.connect = function (address, channelCount, data, connectCallback) {
	if (this.isOffline()) {
		if (typeof connectCallback === 'function') connectCallback.call(this, new Error("host-destroyed"));
		return;
	}
	var self = this;
	var peer;
	var enetAddr = (address instanceof ENetAddress) ? address : new ENetAddress(address);
	var ptr = jsapi_.enet_host_connect(this._pointer, enetAddr.host(), enetAddr.port(), channelCount || 5, data ||
		0);
	var succeeded = false;
	if (ptr) {
		peer = new ENetPeer(ptr);
		peer._host = self;
		self.connectedPeers[ptr] = peer;
		if (connectCallback && (typeof connectCallback === 'function')) {
			peer.on("connect", function () {
				succeeded = true;
				connectCallback.call(self, undefined, peer);
			});
			peer.on("disconnect", function () {
				if (!succeeded) connectCallback.call(self, new Error("failed"));
			});
		}
		return peer;
	} else {
		//ptr is NULL - number of peers exceeded
		if (connectCallback && (typeof connectCallback === 'function')) {
			connectCallback.call(null, new Error("maxpeers"));
			return undefined;
		}
	}
};

ENetHost.prototype.peers = function () {
	var peer, peer_ptr, peers = [];
	for (peer_ptr in this.connectedPeers) {
		peers.push(this.connectedPeers[peer_ptr]);
	}
	return peers;
};

ENetHost.prototype.start = function (ms_interval) {
	var self = this;
	if (!self._pointer) return; //cannot start a host that is not initialised
	if (self._io_loop) {
		clearInterval(this._io_loop);
	}
	self._io_loop = setInterval(function () {
		self._service();
	}, ms_interval || ENET_HOST_SERVICE_INTERVAL);
};
ENetHost.prototype.stop = ENetHost.prototype.destroy;

function ENetPacket(pointer) {
	var self = this;
	if (arguments.length == 1 && typeof arguments[0] == 'number') {
		this._pointer = arguments[0];
		return this;
	}
	if (arguments.length > 0 && typeof arguments[0] == 'object') {
		//construct a new packet from node buffer
		var buf = arguments[0];
		var flags = arguments[1] || 0;
		this._pointer = enet_.packet_create(0, buf.length, flags);
		var begin = jsapi_.packet_get_data(this._pointer);
		var end = begin + buf.length;
		var c = 0,
			i = begin;
		for (; i < end; i++, c++) {
			ENETModule["HEAPU8"][i] = buf.readUInt8(c);
		}

		var callback_ptr = ENETModule["Runtime_addFunction"](function (packet) {
			self.emit("free");
			ENETModule["Runtime_removeFunction"](callback_ptr);
		});
		jsapi_.packet_set_free_callback(this._pointer, callback_ptr);
		events.EventEmitter.call(this);
		return this;
	}
	if (arguments.length > 0 && typeof arguments[0] == 'string') {
		return new ENetPacket(new Buffer(arguments[0]), arguments[1] || 0);
	}
}

ENetPacket.prototype.data = function () {
	var begin = jsapi_.packet_get_data(this._pointer);
	var end = begin + jsapi_.packet_get_dataLength(this._pointer);
	return new Buffer(ENETModule["HEAPU8"].subarray(begin, end), "byte");
	//return HEAPU8.subarray(begin,end);
};
ENetPacket.prototype.dataLength = function () {
	return jsapi_.packet_get_dataLength(this._pointer);
};
ENetPacket.prototype.destroy = function () {
	enet_.packet_destroy(this._pointer);
};

ENetPacket.prototype.FLAG_RELIABLE = ENET_PACKET_FLAG_RELIABLE;

function ENetEvent() {
	this._pointer = jsapi_.event_new();
}

ENetEvent.prototype.free = function () {
	jsapi_.event_free(this._pointer);
};

ENetEvent.prototype.type = function () {
	return jsapi_.event_get_type(this._pointer);
};
ENetEvent.prototype.peer = function () {
	var ptr = jsapi_.event_get_peer(this._pointer);
	return new ENetPeer(ptr);
};
ENetEvent.prototype.peerPtr = function () {
	return jsapi_.event_get_peer(this._pointer);
};
ENetEvent.prototype.packet = function () {
	var ptr = jsapi_.event_get_packet(this._pointer);
	return new ENetPacket(ptr);
};
ENetEvent.prototype.data = function () {
	return jsapi_.event_get_data(this._pointer);
};
ENetEvent.prototype.channelID = function () {
	return jsapi_.event_get_channelID(this._pointer);
};

function ENetAddress() {
	if (arguments.length == 1 && typeof arguments[0] == 'object') {
		if (arguments[0] instanceof ENetAddress) {
			this._host = arguments[0].host();
			this._port = arguments[0].port();
		} else {
			this._host = ip2long((arguments[0]).address || 0);
			this._port = parseInt(arguments[0].port || 0);
		}
		return this;
	}
	if (arguments.length == 1 && typeof arguments[0] == 'number') {
		this._pointer = arguments[0];
		return this;
	}
	if (arguments.length == 1 && typeof arguments[0] == 'string') {
		var ipp = arguments[0].split(':');
		this._host = ip2long(ipp[0]);
		this._port = parseInt(ipp[1] || 0);
		return this;
	}
	if (arguments.length == 2) {
		if (typeof arguments[0] == 'string') {
			this._host = ip2long((arguments[0]));
		} else {
			this._host = arguments[0];
		}
		this._port = parseInt(arguments[1]);
		return this;
	}
	throw ("bad parameters creating ENetAddress");
}

ENetAddress.prototype.host = function () {
	if (this._pointer) {
		var hostptr = jsapi_.address_get_host(this._pointer);
		return ENETModule["HEAPU32"][hostptr >> 2];
	} else {
		return this._host;
	}
};
ENetAddress.prototype.port = function () {
	if (this._pointer) {
		return jsapi_.address_get_port(this._pointer);
	} else {
		return this._port;
	}
};
ENetAddress.prototype.address = function () {
	if (this._pointer) return long2ip(this.host(), 'ENetAddress.prototype.address from pointer');
	return long2ip(this.host(), 'ENetAddress.prototype.address from local');
};

function ENetPeer(pointer) {
	if (pointer) this._pointer = pointer;
	else throw ("ENetPeer null pointer");
	events.EventEmitter.call(this);
	this.setMaxListeners(0);
}

ENetPeer.prototype.send = function (channel, packet, callback) {
	var peer = this;
	if (peer._host.isOffline()) {
		if (typeof callback === 'function') callback.call(peer, new Error("host-destroyed"));
		return;
	}

	if (!peer._pointer) {
		if (callback) callback.call(peer, new Error("Peer is disconnected"));
		return;
	}
	if (packet instanceof Buffer) packet = new ENetPacket(packet, ENET_PACKET_FLAG_RELIABLE);
	if (callback && callback instanceof Function) {
		packet.on("free", function () {
			if (callback) callback.call(peer, undefined);
		});
	}
	if (enet_.peer_send(peer._pointer, channel, packet._pointer) !== 0) {
		if (callback) callback.call(peer, new Error('Packet not queued'));
	}
};
ENetPeer.prototype._delete = function (emitDisconnect) {
	var peer = this;
	if (!peer._pointer) return;
	setTimeout(function () {
		if (peer._host) delete peer._host.connectedPeers[peer._pointer];
		peer._pointer = 0;
		if (peer._host && emitDisconnect) peer.emit("disconnect");
	}, 0);
};

ENetPeer.prototype.reset = function () {
	var peer = this;
	if (!peer._pointer) return;
	enet_.peer_reset(this._pointer);
	peer._delete(false);
};
ENetPeer.prototype.ping = function () {
	var peer = this;
	if (!peer._pointer) return;
	enet_.peer_ping(peer._pointer);
};
ENetPeer.prototype.disconnect = function (data) {
	var peer = this;
	if (!peer._pointer) return;
	enet_.peer_disconnect(peer._pointer, data || 0);
	peer._delete(true);
};
ENetPeer.prototype.disconnectNow = function (data) {
	var peer = this;
	if (!peer._pointer) return;
	enet_.peer_disconnect_now(peer._pointer, data || 0);
	peer._delete(true);
};
ENetPeer.prototype.disconnectLater = function (data) {
	var peer = this;
	if (!peer._pointer) return;
	enet_.peer_disconnect_later(peer._pointer, data || 0);
	peer._delete(true);
};
ENetPeer.prototype.address = function () {
	var peer = this;
	if (!peer._pointer) {
		if (peer._address) return peer._address;
		return;
	}
	var ptr = jsapi_.peer_get_address(peer._pointer);
	var addr = new ENetAddress(ptr);
	//save the address so we can check it after disconnect
	peer._address = {
		address: addr.address(),
		port: addr.port()
	};
	return peer._address;
};

//turn a channel with peer into a node writeable Stream
// ref: https://github.com/substack/stream-handbook
ENetPeer.prototype.createWriteStream = function (channel) {
	var peer = this;
	if (!peer._pointer) return;

	var s = new Stream.Writable();

	peer.on("disconnect", function (data) {
		s.emit("end");
	});

	s._write = function (buf, enc, next) {
		if (!buf.length) return;
		var packet = new ENetPacket(buf, ENET_PACKET_FLAG_RELIABLE);
		peer.send(channel, packet, function (err) {
			if (err) {
				next(err);
				return;
			}
			next();
		});
	};

	return s;
};

ENetPeer.prototype.createReadStream = function (channel) {
	var peer = this;
	if (!peer._pointer) return;

	var s = new Stream.Readable();

	peer.on("disconnect", function (data) {
		s.emit("end");
	});

	peer.on("message", function (_packet, _channel) {
		if (channel === _channel) {
			s.push(_packet.data());
		}
	});

	s._read = function (size) {};

	return s;
};

function ip2long(ipstr) {
	var b = ipstr.split('.');
	return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
}

function long2ip(addr) {
	return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) & 0xff);
}
