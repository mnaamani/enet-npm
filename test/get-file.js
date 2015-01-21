var enet = require("../lib/enet");
var fs = require("fs");

var s_addr = new enet.Address("127.0.0.1", 6666);

enet.createClient(function (err, host) {
	if (err) {
		console.log(err);
		return;
	}
	console.log("client ready");
	host.on("connect", function (peer, data) {
		console.log("connected");
		peer.createReadStream(0).pipe(fs.createWriteStream("./got-file.txt"));
		peer.on("disconnect", function (data) {
			console.log("disconnected from:", peer.address().address());
			process.exit();
		});
	});

	host.connect(s_addr, 1, 0);

});
