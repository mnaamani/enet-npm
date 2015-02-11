var ENETModule = require("../build/enet.js");
var jsapi_ = ENETModule.jsapi;

module.exports.Address = Address;

function ip2long(ipstr) {
	var b = ipstr.split('.');
	return (Number(b[0]) | (Number(b[1]) << 8) | (Number(b[2]) << 16) | (Number(b[3]) << 24)) >>> 0;
}

function long2ip(addr) {
	return (addr & 0xff) + '.' + ((addr >> 8) & 0xff) + '.' + ((addr >> 16) & 0xff) + '.' + ((addr >> 24) &
		0xff);
}

function Address() {
	if (arguments.length == 1 && typeof arguments[0] == 'object') {
		if (arguments[0] instanceof Address) {
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
	throw ("bad parameters creating Address");
}

Address.prototype.host = function () {
	if (this._pointer) {
		var hostptr = jsapi_.address_get_host(this._pointer);
		return ENETModule["HEAPU32"][hostptr >> 2];
	} else {
		return this._host;
	}
};

Address.prototype.port = function () {
	if (this._pointer) {
		return jsapi_.address_get_port(this._pointer);
	} else {
		return this._port;
	}
};

Address.prototype.address = function () {
	if (this._pointer) return long2ip(this.host(), 'Address.prototype.address from pointer');
	return long2ip(this.host(), 'Address.prototype.address from local');
};
