var enet = require("../index.js");
var fs = require("fs");
var Throttle = require("throttle");

var server = enet.createServer({
	address: new enet.Address("0.0.0.0", 6666),
	peers: 32,
	channels: 1,
	down: 0,
	up: 0
}, function (err, server) {
	if (err) {
		console.log(err);
		return;
	}
	console.log("server ready");
	//server.enableCompression();
	server.on("connect", function (peer, data) {
		console.log("sending file:", process.argv[2]);

		var file = fs.createReadStream(process.argv[2]);
		//always create writestreams after connection is made
		var stream = peer.createWriteStream(0);

		var throttle = new Throttle(1024 * 1024 * 5);

		file.pipe(throttle).pipe(stream);

		throttle.on("end", function () {
			console.log("served file.");
			peer.disconnectLater();
		});

		stream.on("error", function (e) {
			console.log("stream error.", e);
		});

	});

	server.start();
});
