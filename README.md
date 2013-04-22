# [ENet](http://enet.bespin.org/) Networking Library cross compiled to javascript

## Installation

    npm install enet


## Quick Tutorial

The Tutorial tries to parallel the [native C library tutorial](http://enet.bespin.org/Tutorial.html)

### Initialisation

    var enet = require("enet");

optionally initialise enet with a packet-filtering function,

    enet.init(filter);
    
    function filter(ipaddress /*String*/, port /*Number*/){
      if(ipaddress === '192.168.0.22'){
        return 0; //value of 0 will drop the packet
      }
      return 1; //value of 1 will pass the packet
    }

### Creating an ENet server

Specify address and port to listen on,

    var addr = new enet.Address("0.0.0.0", /* ANY ADDRESS */
                                 7777      /* UDP Port 7777 */);
    
Create the server (ENetHost),

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
    
    server.on("message",function(peer,packet){
      console.log("received packet contents:",packet.data());
    });
    
Start polling the host for events at 50ms intervals, (default is 30ms if not specified)

    server.start(50);

When done with a host, the host may be destroyed with the destroy() method.
All connected peers to the host will be reset, and the resources used by the host will be freed.

    server.destroy();
     
###Host events

**Event "ready"**

    function(ip /*String*/, port /*Number*/){}
    
When socket is bound to ip address and port.
    
    
**Event "connect"**

    function(peer /*enet.Peer*/, data /*Number*/){}

A connection was established with an enet peer. data is optional data sent by remote peer when connecting.
    
    
**Event: "disconnect"**

    function(peer /*enet.Peer*/, data /*Number*/){}
    
A peer disconnected or timed out, data is optional data sent by remote peer when disconnecting.
    
**Event: "message"**

    function(peer /*enet.Peer*/,packet /*enet.Packet*/,channel_id /*Number*/){}
    
An enet packet was received on channel number channel_id, from enet peer.
    
    
**Event: "telex"**
    
    function(buffer /*Buffer*/,source){}
    
A raw JSON UDP packet (telehash telex) was received represented by a Buffer(),
source is an object with *address* and *port* properties (source of udp packet)

### Creating an ENet client

Create the host,

    var client = enet.createClient({
        peers: 1, /* only allow 1 outgoing connection */
        channels: 2, /* allow up to 2 channels to be used, 0 and 1 */
        down: 57600 / 8, /* 56K modem with 56 Kbps downstream bandwidth */
        up: 14400 / 8 /* 56K modem with 14 Kbps upstream bandwidth */
    });
                              
    //setup event listeners (see creating enet server above)
    
    client.start();
    
### Connecting to an ENet host
    /* connect to server 192.168.1.55:7777 */
    var server_addr = new enet.Address("192.168.1.55",7777);
    /* Initiate the connection, allocating the two channels 0 and 1. */
    var peer = client.connect(server_addr,
                   2, /* channels */
                   1337 /*data to send, (received in 'connect' event at server) */);

    client.on("connect",function(peer,data){
        //connected to peer
        peer.ping();
    });

    client.on("disconnect",function(peer,data){
      //will occur on timeout trying to connect to server/peer or when remote server/peer disconnects/timesout
    });

    //special case - if two enet hosts simulaneously initiate connections to  each other 'connect' event will trigger twice.
    client.on("connect",function(P,data){
       if(peer._pointer === P._pointer){
          //data will always be 0 - trigger when we initiate a connection
       }else{
          //data will be set by peer - when we accept an incoming connection (from same peer)
       }
    });

    
### Sending a packet to an ENet peer
    var packet = new enet.Packet( new Buffer("hello, world"),enet.Packet.FLAG_RELIABLE);
    
    peer.send(0 /*channel*/, packet);


### Disconnecting an ENet peer

    peer.disconnect();
or

    peer.reset();

