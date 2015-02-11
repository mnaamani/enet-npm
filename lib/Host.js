var Buffer = require("buffer").Buffer;
var events = require("events");
var util = require("util");
var ENETModule = require("../build/enet.js");
var enet = require("../index.js");

var jsapi_ = ENETModule.jsapi;
var enet_ = ENETModule.libenet;

var ENET_HOST_SERVICE_INTERVAL = 10; //milliseconds

util.inherits(Host, events.EventEmitter);

module.exports.Host = Host;
module.exports.createServer = createServer;
module.exports.createClient = createClient;
module.exports.createServerFromSocket = createServerFromSocket;

function createServer(arg, callback) {
	return createHost(arg, callback, "server");
}

function createClient(arg, callback) {
	return createHost(arg, callback, "client");
}

function createServerFromSocket(arg, callback) {
	return createHost(arg, callback, "custom");
}

function createHost(arg, callback, host_type) {
	var host, socket;
	var opt = {};

	if (typeof arg === "function") {
		callback = arg;
	} else {
		opt = arg || opt;
	}

	callback = callback || function () {};

	try {
		host = new Host(opt.address, opt.peers, opt.channels, opt.down, opt.up, host_type, opt.socket);
	} catch (e) {
		if (typeof callback === 'function') callback(e);
		return undefined;
	}

	if (!host || host._pointer === 0) {
		setTimeout(function () {
			callback(new Error("host-creation-error"));
		});
		return undefined;
	}

	socket = host._socket;

	if (!socket) {
		setTimeout(function () {
			callback(new Error("socket-creation-error"));
		});
		return undefined;
	}

	//catch socket bind errors
	socket.on("error", function (e) {
		host._socket_closed = true;

		//server will bind so error will be called before listening if error occurs
		//so we can return the error in the callback
		if (host_type === "server") {
			callback(e);
		} else {
			//for client and custom host application can listen for the error event
			host.emit("error", e);
		}

		host.destroy();
	});

	socket.on("close", function () {
		host._socket_closed = true;
		host.destroy();
	});

	socket.on("listening", function () {
		socket.setBroadcast(true);
		//for server host callback when socket is listening
		if (host_type === "server" && typeof callback === 'function') callback(undefined, host);
	});

	//bind the socket
	if (host_type === "server" || host_type === "custom") jsapi_.enet_host_bind(host._pointer);

	if ((host_type === "client" || host_type === "custom") && typeof callback === 'function') {
		setTimeout(function () {
			callback(undefined, host); //clients get host in callback before socket is listening.
		});
	}

	return host;
}

function Host(address, maxpeers, maxchannels, bw_down, bw_up, host_type, custom_socket) {
	events.EventEmitter.call(this);
	this.setMaxListeners(0);
	this.connectedPeers = {};
	var enetAddr;
	var self = this;
	var pointer = 0;
	var socketfd, stream;

	switch (host_type) {
	case "client":
		this._type = "client";
		pointer = jsapi_.enet_host_create_client(maxpeers || 128, maxchannels || 5, bw_down || 0, bw_up ||
			0);
		break;

	case "custom":
		this._type = "custom";
		//insert a socket into emscrtipten FS
		socketfd = ENETModule["createStreamFromSocket"](custom_socket);
		pointer = jsapi_.enet_host_from_socket(socketfd, 0, maxpeers || 128, maxchannels || 5, bw_down ||
			0,
			bw_up ||
			0);
		break;

	case "server":
		this._type = "server";
		address = address || {
			address: "0.0.0.0",
			port: 0
		};
		enetAddr = (address instanceof enet.Address) ? address : new enet.Address(address);
		pointer = jsapi_.enet_host_create_server(enetAddr.host(), enetAddr.port(), maxpeers || 128,
			maxchannels ||
			5,
			bw_down || 0,
			bw_up || 0);
		break;

	default:
		//create a host using the createClient and createServer methods.
		throw (new Error(
			"Do not create a new instance of enet.Host. Use enet.createServer() and enet.createClient() instead."
		));
	}

	if (pointer === 0) {
		throw ('failed to create ENet host');
	}

	self._event = new enet.Event(); //allocate memory for events - free it when we destroy the host
	self._pointer = pointer;
	socketfd = jsapi_.host_get_socket(self._pointer);
	self._socket = ENETModule["getStreamSocket"](socketfd);

	self._packet_free_func_ptr = ENETModule["Runtime_addFunction"](function (packet_ptr) {
		//grab the callback from peer._packet_callback_functions, call its callback indicate if sent flag
		//delete from peer._packet_callback_functions
		var packet, callback;
		Object.keys(self._packet_callback_functions).forEach(function (ptr) {
			//keys are strings
			if (Number(ptr) === packet_ptr) {
				packet = new enet.Packet(packet_ptr);
				callback = self._packet_callback_functions[ptr];
				delete self._packet_callback_functions[ptr];
				callback(packet.wasSent() ? undefined : "packet-not-delivered");
				return;
			}
		});
	});

	self._packet_callback_functions = {}; //packet pointers and their free callback function
}

Host.prototype._addPacketCallback = function (packet, callback) {
	packet._attachFreeCallback(this._packet_free_func_ptr);
	this._packet_callback_functions[packet._pointer] = callback;
};

Host.prototype.isOffline = function () {
	return (typeof this._pointer === "undefined" || this._pointer === 0 || this._shutting_down || this._socket_closed);
};

Host.prototype.isOnline = function () {
	return (this.isOffline() === false);
};

Host.prototype._service = function () {
	var self = this;
	var peer;
	var recvdAddr;
	if (self._servicing) return;
	self._servicing = true;

	if (!self._pointer || !self._event || self._socket_closed) return;
	var err = enet_.host_service(self._pointer, self._event._pointer, 0);
	while (err > 0) {

		switch (self._event.type()) {
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
				peer._delete(true, self._event.data());
			}
			break;
		case 3: //receive
			peer = self.connectedPeers[self._event.peerPtr()] || self._event.peer();
			self.emit("message",
				peer,
				self._event.packet(),
				self._event.channelID()
			);
			//todo - return packet.data() not packet (incase app wants to handle the packet asynchronously)
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
	self._servicing = false;
};

Host.prototype.destroy = function () {
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
		if (peer && peer._pointer !== 0) {
			if (!self._socket_closed) enet_.peer_disconnect_now(peer_ptr, 0);
			peer._pointer = 0;
			peer.emit("disconnect", 0);
		}
	}
	delete self.connectedPeers;
	self.flush();

	if (self._event) self._event.free();

	try {
		if (self._pointer) enet_.host_destroy(self._pointer);
	} catch (e) {}

	if (self._packet_free_func_ptr) ENETModule["Runtime_removeFunction"](self._packet_free_func_ptr);
	delete self._packet_callback_functions;

	delete self._pointer;
	delete self._event;
	delete self._io_loop;
	delete self._socket;
	self.emit("destroy");
};

Host.prototype.stop = Host.prototype.destroy;

Host.prototype.receivedAddress = function () {
	if (this.isOffline()) return;
	var ptr = jsapi_.host_get_receivedAddress(this._pointer);
	var addr = new enet.Address(ptr);
	return ({
		address: addr.address(),
		port: addr.port()
	});
};

Host.prototype.address = function () {
	if (this.isOffline()) return;
	return this._socket.address();
};

Host.prototype.send = function (ip, port, buff, callback) {
	if (this.isOffline()) return;
	this._socket.send(buff, 0, buff.length, port, ip, callback);
};

Host.prototype.flush = function () {
	if (this.isOffline()) return;
	enet_.host_flush(this._pointer);
};

Host.prototype.connect = function (address, channelCount, data, callback) {
	if (this.isOffline()) {
		if (typeof callback === 'function') callback(new Error("host-destroyed"));
		return;
	}

	var self = this;
	var peer;
	var enetAddr = (address instanceof enet.Address) ? address : new enet.Address(address);
	var ptr = jsapi_.enet_host_connect(this._pointer, enetAddr.host(), enetAddr.port(), channelCount || 5,
		data ||
		0);

	self.firstStart(); //start servicing if not yet started

	var succeeded = false;

	if (ptr) {
		peer = new enet.Peer(ptr);
		peer._host = self;
		self.connectedPeers[ptr] = peer;
		if (typeof callback === 'function') {
			peer.on("connect", function () {
				succeeded = true;
				callback(undefined, peer);
			});
			peer.on("disconnect", function () {
				if (!succeeded) callback(new Error("failed"));
			});
		}
		return peer;
	}

	if (typeof callback === 'function') {
		setTimeout(function () {
			callback(new Error("maxpeers"));
		});
	}

	return undefined;
};

Host.prototype.throttleBandwidth = function () {
	if (this.isOffline()) return;
	enet_.host_bandwidth_throttle(this._pointer);
	return this;
};

Host.prototype.enableCompression = function () {
	if (this._pointer) {
		enet_.host_compress_with_range_coder(this._pointer);
	}
	return this;
};

Host.prototype.disableCompression = function () {
	if (this._pointer) {
		enet_.host_compress(this._pointer, 0); //passing a 0 disables compression
	}
	return this;
};

Host.prototype.broadcast = function (channel, packet) {
	if (this.isOffline()) return;

	if (packet instanceof Buffer) packet = new enet.Packet(packet, enet.PACKET_FLAG.RELIABLE);

	enet_.host_broadcast(this._pointer, channel, packet._pointer);
};

Host.prototype.peers = function () {
	var peer_ptr, peers = [];
	for (peer_ptr in this.connectedPeers) {
		peers.push(this.connectedPeers[peer_ptr]);
	}
	return peers;
};

Host.prototype.firstStart = function () {
	var self = this;
	if (!self._io_loop) {
		self._io_loop = setInterval(function () {
			self._service();
		}, ENET_HOST_SERVICE_INTERVAL);
	}
};

Host.prototype.start = function (ms_interval) {
	var self = this;
	if (!self._pointer) return; //cannot start a host that is not initialised
	if (self._io_loop) {
		clearInterval(self._io_loop);
	}
	self._io_loop = setInterval(function () {
		self._service();
	}, ms_interval || ENET_HOST_SERVICE_INTERVAL);
};
