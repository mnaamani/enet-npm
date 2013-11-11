### ENet Quick Tutorial

Following the same steps as the native C library [tutorial](http://enet.bespin.org/Tutorial.html) ...

### Initialisation

    var enet = require("enet");

optionally initialise enet with a packet-filtering function,

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
    
Create the server,

    var server = enet.createServer({
        address: addr, /* the enet.Address to bind the server host to */
        peers:32, /* allow up to 32 clients and/or outgoing connections */
        channels:2, /* allow up to 2 channels to be used, 0 and 1 */
        down:0, /* assume any amount of incoming bandwidth */
        up:0 /* assume any amount of outgoing bandwidth */
    });
                              
An exception will be thrown if an error occured creating the host.

Setup some event listeners,

    server.on("ready",function(ip,port){
      console.log("socket bound to port",port);
    });
    
    server.on("connect",function(peer,data){
        //incoming peer connection
        peer.on("message",function(packet,channel){
            console.log("received packet contents:",packet.data());
        });
    });
    
Start polling the host for events at 50ms intervals, (default is 30ms if not specified)

    server.start(50);

When done with a host, the host may be destroyed with the destroy() method.
All connected peers to the host will be reset, and the resources used by the host will be freed.

    server.destroy();
     
### Creating an ENet client (instance of enet.Host)

Create the host,

    var client = enet.createClient({
        peers: 1, /* only allow 1 outgoing connection */
        channels: 2, /* allow up to 2 channels to be used, 0 and 1 */
        down: 57600 / 8, /* 56K modem with 56 Kbps downstream bandwidth */
        up: 14400 / 8 /* 56K modem with 14 Kbps upstream bandwidth */
    });
                              
    client.start();
    

### Managing an enet.Host
enet.Host emits the following events:

**Event "ready"**

    function(ip /*String*/, port /*Number*/){}
    
For a server host, when socket is bound to ip address and port.
For a client host, when socket is bound after an outgoing connection is initiated.
This event may fire before start()'ing the host if created with createServer()
    
    
**Event "connect"**

    function(peer /*enet.Peer*/, data /*Number*/, outgoing /*Boolean*/){}

Peer connection established, `outgoing` is `true` if we initiated connection.
`data` is optional connect data sent by remote `peer`
for an incoming connection, `undefined` otherwise.
    
    
**Event: "message"**

    function(peer /*enet.Peer*/, packet /*enet.Packet*/, channel /*Number*/){}
    
An enet `packet` was received on channel number `channel`, from `peer`.
    
    
**Event: "telex"**
    
    function(buffer /*Buffer*/,source){}
    
A raw JSON UDP packet (telehash telex) was received represented by a Buffer(),
source is an object with `address` and `port` properties (source of udp packet)


### Connecting to an ENet host
    /* connect to server 192.168.1.55:7777 */
    var server_addr = new enet.Address("192.168.1.55",7777);
 
    /* Initiate the connection, allocating the two channels 0 and 1. */
    var peer = client.connect(server_addr,
                   2, /* channels */
                   1337, /* data to send, (received in 'connect' event at server) */
                   function(err,peer){ /* on connect callback function */
                      if(err){
                        console.error(err);//either connect timeout or maximum peers exceeded
                        return;
                      }
                      //connection to the remote host succeeded
                      peer.ping();
                   });
                   
    //connect event can also be handled with an event handler
    peer.on("connect",function(){
        //connection to the remote host succeeded
        peer.ping();
    });
    
### Sending a packet to an ENet peer
    var packet = new enet.Packet( new Buffer("hello, world"),enet.Packet.FLAG_RELIABLE);
    
    peer.send(0 /*channel*/, packet, function(err){
        //callback when packet is sent 'err' will be 'undefined'
        //If error occurs trying to queue the packet err be an instance of Error()
    });


### Peer events

**Event: "connect"**

Connection to remote host established.

**Event: "message"**

    function(packet /*enet.Packet*/,channel_id /*Number*/){}

**Event: "disconnect"**

    function(data /*Number*/){}
    
Peer disconnected or connection lost, `data` is optional data sent by remote peer when disconnecting.
    

### Disconnecting an ENet peer

    peer.disconnect(999); /*send 999 as data with disconnect message*/
or
    peer.reset();

### Streams

To communicate with a peer using the streams API we can turn a channel into a readable stream and writeable stream.

For example use createReadStream method to create a readable stream:

    var stream = peer.createReadStream(0);
    stream.pipe(process.stdout);

will pipe the data coming in on channel 0 with peer to stdout.

A writeable stream can be created using createWriteStream method of peer:

    var file = fs.createReadStream("data.txt");
    var stream = peer.createWriteStream(2);
    file.pipe(stream);

will send the contents of data.txt file to the peer on channel 2
