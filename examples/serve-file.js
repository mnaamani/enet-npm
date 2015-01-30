var enet = require("../index.js");
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
	server.enableCompression();
	server.on("connect", function (peer, data) {
		console.log("sending file:", process.argv[2]);

		var file = fs.createReadStream(process.argv[2]);
		//always create writestreams after connection is made
		var stream = peer.createWriteStream(0);

		file.pipe(stream);

		file.on("end", function () {
			//note: outgoingDataTotal is not only the size of the file.
			//It includes total data exchanged with peer
			console.log("served file.\n%s bytes trasmitted to peer.", peer.outgoingDataTotal());
			peer.disconnectLater();
		});

		stream.on("error", function (e) {
			console.log("stream error.", e);
		});

	});

	server.start();
});
