var enet = require("../lib/enet.js");

var addr1 = new enet.Address("0.0.0.0", 5000);
var server = new enet.Host(addr1, 32);

server.on("connect", function (peer, data) {
	console.log("client connected. data=", data);
	console.log("client address:", peer.address().address + ":" + peer.address().port);

	//when last client connects send the broadcast
	if (data === 789) setTimeout(function () {
		var packet = new enet.Packet("Broadcast Message", 1);
		server.broadcast(0, packet); //send a broadcast to all peers.
	}, 0); //wait 1s for both client to connect

	setTimeout(function () {
		server.destroy();
	}, 2000);

}).start();


function doClientConnect(connectData) {
	var client = new enet.Host(new enet.Address("0.0.0.0", 0), 32);

	client.connect(new enet.Address("127.0.0.1", 5000), 5, connectData, function (err, peer, data) {
		if (err) process.exit();
		console.log("client connected");
		peer.on("disconnect", function () {
			setTimeout(function () {
				client.destroy();
			}, 2000);
		}).on("message", function (packet, channel) {
			console.log("got message:", packet.data().toString(), "on channel", channel);
		});
	});
}

doClientConnect(123);
doClientConnect(456);
doClientConnect(789);
