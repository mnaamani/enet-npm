### ENet Quick Tutorial

Following the same steps as the native C library [tutorial](http://enet.bespin.org/Tutorial.html) ...

### Initialisation

	var enet = require("enet");

optionally initialise enet with a packet-filtering function. It will be applied
to all incoming packets for all hosts:

	enet.init(function(ipaddress /*String*/, port /*Number*/){
	  if(ipaddress === '192.168.0.22'){
		return 0; //drop the packet
	  }
	  return 1; //permit the packet
	});

### Creating an ENet server (instance of enet.Host)

Specify address and port to listen on,

	var addr = new enet.Address("0.0.0.0", /* ANY ADDRESS */
								 7777      /* UDP Port 7777 */);
or

	var addr = {address:"0.0.0.0", port:7777}

Create the server, it will be returned in the callback,

	enet.createServer({
		address: addr, /* the address the server host will bind to */
		peers:32, /* allow up to 32 clients and/or outgoing connections */
		channels:2, /* allow up to 2 channels to be used, 0 and 1 */
		down:0, /* assume any amount of incoming bandwidth */
		up:0 /* assume any amount of outgoing bandwidth */

	},function(err, host){
		if(err){
			return; /* host creation failed */
		}

		//setup event handlers..
		host.on("connect",function(peer,data){
			//incoming peer connection
			peer.on("message",function(packet,channel){
				console.log("received packet contents:",packet.data());
			});
		});

		//start polling the host for events at 50ms intervals
		host.start(50);
	});

When done with a host, the host should be destroyed with the destroy() method.
All connected peers to the host will be reset, and the resources used by the host will be freed.

	server.destroy();

### Creating an ENet client (instance of enet.Host)

Create the host, no address need to be specified to bind the host to. Bandwidth may be specified for the client host as in the above example. The peers count controls the maximum number of connections to other server hosts that may be simultaneously open.
A client host will not accept incoming connections.

	enet.createClient({
		peers: 1, /* only allow 1 outgoing connection */
		channels: 2, /* allow up to 2 channels to be used, 0 and 1 */
		down: 57600 / 8, /* 56K modem with 56 Kbps downstream bandwidth */
		up: 14400 / 8 /* 56K modem with 14 Kbps upstream bandwidth */
	},function(err, host){
		if(err){
			return; /* host creation failed */
		}
		//setup event handler
		host.on("connect",function(peer,data){
			//incoming peer connection
			peer.on("message",function(packet,channel){
				console.log("received packet contents:",packet.data());
			});
		});
	});

Polling the host for events begins automatically when the host makes its first outgoing connection.

### Managing an enet.Host
enet.Host emits the following events:

**connect** event is emitted when either a new client host has connected to the server host or when an attempt to establish a connection with a foreign host has succeeded.

	host.on("connect", function(peer, data, outgoing){
		//handle new connected peer
	});

 `outgoing` is `true` if the local host initiated connection.
`data` is optional connect data sent by foreign host (the `peer`)
for an incoming connection, and `undefined` if connection was initiated from local host.


**message** event is emitted when a packet is received from a connected peer.

	host.on("message", function(peer, packet, channel){
		//handle incoming packet
	});

An enet `packet` was received on channel number `channel`, from `peer`.

**destory** event will be emitted when the host is destroyed.

**telex** event is emitted when a raw JSON packet (telehash telex) is received.

	host.on("telex", function(buffer /*Buffer*/,source){
		//hand of to telehash switch for processing
	});

source is an object with `address` and `port` properties (source of udp packet)


### Connecting to an ENet host
	/* connect to server 192.168.1.55:7777 */
	var server_addr = new enet.Address("192.168.1.55",7777);

	/* Initiate the connection, allocating the two channels 0 and 1. */
	var peer = client.connect(server_addr,
				   2, /* channels */
				   1337, /* data to send, (received in 'connect' event at server) */
				   function(err,peer){ /* a connect callback function */
					  if(err){
						console.error(err);//either connect timeout or maximum peers exceeded
						return;
					  }
					  //connection to the remote host succeeded
					  peer.ping();
				   });

	//succesful connect event can also be handled with an event handler
	peer.on("connect",function(){
		//connection to the remote host succeeded
		peer.ping();
	});

### Sending a packet to an ENet peer

Packets in ENet are created from a string or Buffer.

	var packet = new enet.Packet(new Buffer("hello, world"), enet.PACKET_FLAG.RELIABLE);

or

	var packet = new enet.Packet("hello");

enet.PACKET_FLAG.RELIABLE specifies that the packet must use reliable delivery. A reliable packet is guaranteed to be delivered, and a number of retry attempts will be made until an acknowledgement is received from the peer. If a certain number of retry attempts is reached without any acknowledgement, ENet will assume the peer has disconnected and forcefully reset the connection. If this flag is not specified, the packet is assumed an unreliable packet, and no retry attempts will be made nor acknowledgements generated.

A packet is sent to a peer with the  peer.send() method. peer.send() accepts a channel id over which to send the packet, the packet, and a callback function. Once the packet is sent or an error occurs queuing the packet for delivery the callback will be called.

	peer.send(0 /*channel*/, packet, function(err){
		//callback called when packet is sent or on failure to que packet
		//If packet is queued but not sent this callback will not be called.
	});


### Peer events

**connect** event is emitted when the peer successfully connects to a remote host.

**message** event is emitted when a packet is received from a the peer.

	peer.on("message", function(packet, channel_id){
		//handle packet from peer
	});

**disconnect** event is emitted when a the peer has either explicitly disconnected or timed out.

	peer.on("disconnect", function(data){
		//peer disconnected
	});

`data` is optional data sent by remote peer when disconnecting.


### Disconnecting an ENet peer

	peer.disconnect(999); /*send 999 as data with disconnect message*/

### Streams

To communicate with a peer using the streams API we can turn a channel into a readable stream or writeable stream.

For example use createReadStream method to create a readable stream:

	var stream = peer.createReadStream(0);
	stream.pipe(process.stdout);

will pipe the data coming in on channel 0 from peer to stdout.

A writeable stream can be created using createWriteStream method of peer:

	var file = fs.createReadStream("data.txt");
	var stream = peer.createWriteStream(2);
	file.pipe(stream);

will send the contents of data.txt file to the peer on channel 2

A duplex stream can also be created with peer.createDuplexStream() method

Ideally streams should be created after a peer is in CONNECTED state. (in the connect event listeners)
If you try to read from or write to a stream of a disconnected peer it will raise the error event on the stream.
