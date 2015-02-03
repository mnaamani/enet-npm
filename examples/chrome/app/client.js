var enet = ENET;
var Buffer = ENET.Buffer;

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
			console.log("connected");
			console.log("connected to:", peer.address());

			peer.on("message", function (packet, chan) {
				console.log("got message:", packet.data().toString());
			});

			peer.once("disconnect", function () {
				console.log("disconnected.");
				console.log("shutting down...");
				client.destroy();
			});

			var packet = new enet.Packet(new Buffer("Hello\n"), enet.PACKET_FLAG.RELIABLE);

			peer.send(0, packet, function (err) {
				if (err) console.log("error sending packet:", e);
			});

			peer.send(0, "test 123...\n");

		});
	}
});
