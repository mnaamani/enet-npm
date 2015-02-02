var enet = require("../index.js");
var fs = require("fs");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, host) {
	if (err) {
		console.log(err);
		return;
	}
	//host.enableCompression();
	console.log("client ready, connecting...");
	var peer = host.connect(s_addr, 1, 0);
	peer.on("connect", function () {
		console.log("connected");
		var stream = peer.createReadStream(0);
		stream.pipe(fs.createWriteStream("./got-file.txt"));
		stream.on("end", function () {
			console.log("received file.");
		});
		stream.on("error", function (e) {
			console.log("streaming error:", e);
		});
	});

	peer.on("disconnect", function () {
		console.log("disconnected.");
		host.stop();
	});
});
