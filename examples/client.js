var enet = require("../index.js");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, client) {
	if (err) {
		console.log(err);
		return;
	}
	client.enableCompression();
	client.on("destroy", function () {
		console.log("shutdown!");
	});

	connect();

	console.log("connecting...");

	function connect() {
		client.connect(s_addr, 1, 0, function (err, peer, data) {
			if (err) {
				console.log(err);
				if (err.message === "host-destroyed") process.exit();
				console.log("retrying...");
				setTimeout(connect, 1000);
				return;
			}

			console.log("connected to:", peer.address());

			peer.on("message", function (packet, chan) {
				console.log("got message:", packet.data().toString());
			});

			peer.on("disconnect", function () {
				console.log("disconnected, sending final packet");
				peer.send(0, "final packet", function (err) {
					console.log(err || "final packet sent!");
				});

				console.log("shutting down");
				setTimeout(function () {
					client.destroy();
				});
			});

			var packet1 = new enet.Packet(new Buffer("Hello\n"), enet.PACKET_FLAG.RELIABLE);
			console.log("sending packet 1...");
			peer.send(0, packet1, function (err) {
				if (err) {
					console.log("error sending packet 1:", err);
				} else {
					console.log("packet 1 sent.");
				}
			});

			var packet2 = new enet.Packet(new Buffer("test unreliable packet\n"), enet.PACKET_FLAG.UNRELIABLE);
			console.log("sending packet 2...");
			peer.send(0, packet2, function (err) {
				if (err) {
					console.log("error sending packet 2:", err);
				} else {
					console.log("packet 2 sent.");
				}
			});

			peer.disconnectLater();

			var packet3 = new enet.Packet(new Buffer("test after disconnect\n"), enet.PACKET_FLAG.RELIABLE);
			console.log("sending packet 3...");
			peer.send(0, packet3, function (err) {
				if (err) {
					console.log("error sending packet 3:", err);
				} else {
					console.log("packet 3 sent.");
				}
			});
		});
	}
});
