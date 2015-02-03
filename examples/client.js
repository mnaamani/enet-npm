var enet = require("../index.js");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, client) {
	if (err) {
		console.log(err);
		return;
	}

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
			console.log("connected");
			console.log("connected to:", peer.address());

			peer.on("message", function (packet, chan) {
				console.log("got message:", packet.data().toString());
			});

			peer.on("disconnect", function () {
				console.log("disconnected.");
				console.log("shutting down...");
				setTimeout(function () {
					client.destroy();
				});
			});

			var packet1 = new enet.Packet(new Buffer("Hello\n"), enet.PACKET_FLAG.RELIABLE);

			peer.send(0, packet1, function (err) {
				if (err) {
					console.log("error sending packet1:", err);
				} else {
					console.log("packet1 sent.");
				}
			});

			peer.disconnectLater();

			var packet2 = new enet.Packet(new Buffer("test 123\n"), enet.PACKET_FLAG.RELIABLE);

			peer.send(0, packet2, function (err) {
				if (err) {
					console.log("error sending packet2:", err);
				} else {
					console.log("packet2 sent.");
				}
			});
		});
	}
});
