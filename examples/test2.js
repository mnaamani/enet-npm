var enet = require("../index.js");

//init enet with a packet filter..
enet.init(function (ip, port) {
	//return 0 //to drop the packet
	//return 1 //to allow the packet through
	console.error("packet source:", ip, port);
	return 1;
});

var addr1 = new enet.Address("0.0.0.0", 5000);
var server = new enet.Host(addr1, 32);

server.on("connect", function (peer, data) {
	console.log("peer connected. data=", data);
	console.log("peer address:", peer.address().address + ":" + peer.address().port);
	var packet1 = new enet.Packet("Bye Bye1", 1);
	var packet2 = new enet.Packet("Bye Bye2", 1);
	peer.send(1, packet1, function (err) {
		if (!err) console.log("packet1 sent");
	}).disconnectLater().send(1, packet2, function (err) {
		if (!err) console.log("packet2 sent");
		//packet2 will not get queed because disconnectLater() was called
	});
}).start();

enet.createClient(function (err, client) {
	if (err) {
		console.log("client error:", err);
		server.destroy();
		return;
	}
	client.connect(new enet.Address("127.0.0.1", 5000), 5, 6969, function (err, peer, data) {
		if (err) process.exit();
		peer.on("disconnect", function () {
			console.log("client got disconnect");
			server.destroy();
			client.destroy();
			//process.exit();
		}).on("message", function (packet, channel) {
			console.log("got message:", packet.data().toString(), "on channel", channel);
		});
	});
});