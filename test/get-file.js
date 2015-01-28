var enet = require("../lib/enet");
var fs = require("fs");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, host) {
	if (err) {
		console.log(err);
		return;
	}
	console.log("client ready, connecting...");

	var peer = host.connect(s_addr, 1, 0);

	var interval = setInterval(function () {
		//wait until we are in connected state
		if (peer.state() === enet.PEER_STATE.CONNECTED) {
			clearInterval(interval);
			clearTimeout(timeout);
			console.log("connected to:", peer.address().address);
			var stream = peer.createReadStream(0);
			stream.pipe(fs.createWriteStream("./got-file.txt"));
			stream.on("end", function () {
				console.log("disconnected.");
				host.stop();
			});
		}
	}, 200);
	peer.on("disconnect", function () {
		host.stop();
	});
	var timeout = setTimeout(function () {
		if (interval) {
			clearInterval(interval);
			console.log("timeout connecting to server!");
			peer.disconnect();
		}
	}, 10000);

});
