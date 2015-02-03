var enet = require("../index.js");
var assert = require("assert");

//create a custom socket for enet host
//in this example we are using a node dgram,
//we could pass in any object that is an event emitter and follows the same dgram API
//possibly a proxied UDP connection over HTTP/WebSockets

var mysocket = require("dgram").createSocket("udp4");
mysocket.on("listening", function () {
	console.log("mysocket listening...");
	start_server(mysocket);
});
mysocket.bind(6666);

function start_server(socket) {
	console.log("starting server");
	enet.createServerFromSocket({
			socket: socket
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
				peer.createWriteStream(peer, 0).write("hello I'm the server!");
				peer.createReadStream(0).pipe(process.stdout);
				setTimeout(function () {
					peer.disconnect();
				}, 2000);

				peer.on("disconnect", function () {
					console.log("disconnected peer");
					host.stop();
				});
			});

			host.on("destroy", function () {
				console.log("Host Destroyed, but socket should still be open.");
				assert(mysocket._receiving === true);
				mysocket.close();
			});

			host.start();
		}
	);
}
