var enet = require("../lib/enet");
var fs = require("fs");

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
	server.on("connect", function (peer, data) {
		console.log("connected");
		var file = fs.createReadStream(process.argv[2]);
		var stream = peer.createWriteStream(0);

		file.on("end", function () {
			console.log("served file. sent:", peer.outgoingDataTotal(), "bytes");
			peer.disconnectLater();
		});

		file.pipe(stream);

	});

	server.start();
});
