EMCC=`./find-emcc.py`/emcc
OPTIMISE= -O2 --closure 0 --llvm-opts 1 --minify 0
ENET_SOURCE=./src/enet-1.3.5

module:
	$(EMCC) src/jsapi.c $(ENET_SOURCE)/*.c -I$(ENET_SOURCE)/include \
        --pre-js src/enet_pre.js -o lib/_enet.js $(OPTIMISE) \
        -s TOTAL_MEMORY=1048576  -s TOTAL_STACK=409600 -s LINKABLE=1
	cat src/header.js lib/_enet.js src/footer.js > lib/enet.js
	rm lib/_enet.js
