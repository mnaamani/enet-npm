#include <enet/enet.h>
#include <string.h>
#include <stdio.h>
#include <emscripten/emscripten.h>
#include <sys/socket.h>

#define MAXTOKENS_PER_TELEX 32

void jsapi_init(int (ENET_CALLBACK * packet_filter) (ENetHost* host)){
  if(packet_filter){
	ENetCallbacks callbacks = { NULL, NULL, NULL, packet_filter };
		enet_initialize_with_callbacks(ENET_VERSION, &callbacks);
	 return;
  }
  enet_initialize();
}

ENetHost* jsapi_enet_host_create(unsigned int host, int port,int maxpeers, int maxchannels, int bw_down, int bw_up){
	ENetAddress address;
	address.host = host;
	address.port = port;

	return enet_host_create (& address     /* the address to bind the server host to */,
							   maxpeers    /* allow up to maxpeers clients and/or outgoing connections */,
							   maxchannels /* allow up to maxchannels channels to be used, 0,1,...maxcahnnels*/,
							   bw_down    /* assume bw_in (Bytes/s) of incoming bandwidth */,
							   bw_up   /* assume bw_out (Bytes/s) of outgoing bandwidth */);
}

ENetHost* jsapi_enet_host_create_client(int maxconn, int maxchannels, int bw_down, int bw_up){
	ENetHost* host = enet_host_create (NULL      /*create a client - doesn't accept incoming connections*/,
							   maxconn    /* allow up to maxconn outgoing connections */,
							   maxchannels /* allow up to maxchannels channels to be used, 0 and 1 */,
							   bw_down    /* assume bw_down (Bytes/s) incoming bandwidth */,
							   bw_up   /* assume bw_up (Bytes/s) outgoing bandwidth */);
	host -> isClient = 1;
	return host;
}

ENetPeer* jsapi_enet_host_connect(ENetHost* host, unsigned int destinationHost, int port, int channelCount, int data){
	ENetAddress address;
	address.host = destinationHost;
	address.port = port;
	return enet_host_connect(host,&address,channelCount,data);
}

//ENetEvent - helpers
void * jsapi_event_new(){
	return malloc(sizeof(ENetEvent));
}
void jsapi_event_free(ENetEvent *event){
	free(event);
}
ENetEventType jsapi_event_get_type(ENetEvent* event){
  return event->type;
}
ENetPeer* jsapi_event_get_peer(ENetEvent* event){
  return event->peer;
}
int jsapi_event_get_channelID(ENetEvent *event){
  return event->channelID;
}
ENetPacket* jsapi_event_get_packet(ENetEvent* event){
  return event->packet;
}
void* jsapi_event_get_data(ENetEvent* event){
  return event->data;
}
//ENetAddress - helpers
enet_uint32* jsapi_address_get_host(ENetAddress* address){
  //emscripten can only return signed int using the ccall so
  //we will return a pointer to the unsigned int and grab it
  //directly from memory!
 return &address->host;
}
int jsapi_address_get_port(ENetAddress* address){
  return address->port;
}

//ENetPacket - helpers
enet_uint8* jsapi_packet_get_data(ENetPacket* packet){
  return packet->data;
}
int jsapi_packet_get_dataLength(ENetPacket* packet){
  return packet->dataLength;
}
void jsapi_packet_set_free_callback(ENetPacket *packet, ENetPacketFreeCallback callback){
	packet->freeCallback = callback;
}
//ENetHost - helpers
ENetAddress* jsapi_host_get_receivedAddress(ENetHost *host){
  return &host->receivedAddress;
}
int jsapi_host_get_peerCount(ENetHost* host){
  return host->peerCount;
}
int jsapi_host_get_channelLimit(ENetHost *host){
  return host->channelLimit;
}
unsigned char* jsapi_host_get_receivedData(ENetHost *host){
  return host->receivedData;
}
int jsapi_host_get_receivedDataLength(ENetHost *host){
  return host->receivedDataLength;
}
ENetSocket jsapi_host_get_socket(ENetHost* host){
  return host->socket;
}
//ENetPeer - helpers
ENetAddress* jsapi_peer_get_address(ENetPeer* peer){
  return &peer->address;
}
unsigned char* jsapi_peer_get_data(ENetPeer* peer){
  return peer -> data;
}
int jsapi_peer_get_channelCount(ENetPeer* peer){
  return peer->channelCount;
}

ENetPeerState jsapi_peer_get_state(ENetPeer* peer){
	return peer->state;
}
enet_uint32   jsapi_peer_get_incomingDataTotal(ENetPeer* peer){
	return peer->incomingDataTotal;
}
enet_uint32   jsapi_peer_get_outgoingDataTotal(ENetPeer* peer){
	return peer->outgoingDataTotal;
}
