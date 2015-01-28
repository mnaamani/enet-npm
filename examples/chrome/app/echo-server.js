var global_server;

ENET.createServer({
		address: {
			address: "0.0.0.0",
			port: "6666"
		},
	},
	function (err, host) {
		if (err) {
			console.log(err);
			return;
		}
		global_server = host;
		console.log("host ready on %s:%s", host.address().address, host.address().port);

		host.on("connect", function (peer, data) {
			console.log("peer connected");
			peer.createReadStream(0).pipe(peer.createWriteStream(0));
		});

		host.start();
	}
);
