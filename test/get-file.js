var enet = require("enet");
var fs = require("fs");

var s_addr = new enet.Address("127.0.0.1",6666);

var C = enet.createClient();

C.on("connect",function(peer,data){
    C.createStream(peer,0).pipe(fs.createWriteStream("./got-file.txt"));
});

C.on("disconnect",function(peer,data){
    console.log("disconnected from:",peer.address().address());
    process.exit();
});

C.connect(s_addr,1,0);

C.start(25);
