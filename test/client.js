var enet = require("../lib/enet");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, client) {
	if (err) {
		console.log(err);
		return;
	}

	client.on("destroy", function () {
		console.log("shutdown.");
	});

	connect();

	function connect() {
		console.log("connecting...");
		client.connect(s_addr, 1, 0, function (err, peer, data) {
			if (err) {
				console.log("timeout!");
				setTimeout(connect, 500);
				return;
			}
			console.log("connected to: %s:%s", peer.address().address(), peer.address().port());
			var packet = new enet.Packet(new Buffer("hello, I'm the client\n"), enet.Packet.FLAG_RELIABLE);
			peer.send(0, packet);

			peer.on("message", function (packet, chan) {
				console.log("got message:", packet.data().toString());
			});

			peer.on("disconnect", function () {
				console.log("disconnected.");
				console.log("shutting down...");
				client.destroy();
			});
		});
	}
});
