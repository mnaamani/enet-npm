var enet = require("../lib/enet");
var fs = require("fs");

var s_addr = new enet.Address("127.0.0.1",6666);

var C = enet.createClient();

C.on("connect",function(peer,data){
    peer.createReadStream(0).pipe(fs.createWriteStream("./got-file.txt"));
    peer.on("disconnect",function(data){
        console.log("disconnected from:",peer.address().address());
        process.exit();
    });
});

C.connect(s_addr,1,0);

C.start(25);
