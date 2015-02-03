#browserify enet and some methods to process shim to make emscripten runtime think it is in NODE environment
browserify --im ../../index.js -s ENET | sed -e "s/var process = module.exports = {};/var process=module.exports={};process.platform='browser';process.stdout={write:function(x){console.log(x)}};process.stderr={write:function(x){console.error(x)}};process.exit=noop;/" > app/bundle.js
