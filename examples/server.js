var enet = require("../index.js");

enet.createServer({
		address: {
			address: "0.0.0.0",
			port: "6666"
		},
		peers: 32,
		channels: 1,
		down: 0,
		up: 0
	},
	function (err, host) {
		if (err) {
			console.log(err);
			return;
		}
		host.enableCompression();
		console.log("host ready on %s:%s", host.address().address, host.address().port);

		host.on("connect", function (peer, data) {
			console.log("peer connected");
			peer.createWriteStream(0).write("hello I'm the server!");
			peer.createReadStream(0).pipe(process.stdout);
			setTimeout(function () {
				peer.disconnectLater();
			}, 2000);

			peer.on("disconnect", function () {
				console.log("peer disconnected");
			});
		});

		host.start();
	}
);
