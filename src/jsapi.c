#include <string.h>
#include <time.h>
#include <enet/enet.h>
#include <stdio.h>
#include <emscripten/emscripten.h>
#include <sys/socket.h>

void jsapi_init(int (ENET_CALLBACK * packet_filter) (ENetHost* host)){
  if(packet_filter){
	ENetCallbacks callbacks = { NULL, NULL, NULL, packet_filter };
		enet_initialize_with_callbacks(ENET_VERSION, &callbacks);
	 return;
  }
  enet_initialize();
}

ENetHost *
jsapi_enet_host_from_socket (ENetSocket sock, const ENetAddress * address, size_t peerCount, size_t channelLimit, enet_uint32 incomingBandwidth, enet_uint32 outgoingBandwidth)
{
	ENetHost * host;
	ENetPeer * currentPeer;

	if (peerCount > ENET_PROTOCOL_MAXIMUM_PEER_ID)
	  return NULL;

	host = (ENetHost *) enet_malloc (sizeof (ENetHost));
	if (host == NULL)
	  return NULL;
	memset (host, 0, sizeof (ENetHost));

	host -> peers = (ENetPeer *) enet_malloc (peerCount * sizeof (ENetPeer));
	if (host -> peers == NULL)
	{
	   enet_free (host);

	   return NULL;
	}
	memset (host -> peers, 0, peerCount * sizeof (ENetPeer));

	host -> socket = sock;
	if (host -> socket == ENET_SOCKET_NULL)
	{
	   enet_free (host -> peers);
	   enet_free (host);

	   return NULL;
	}

	if (address != NULL)
	  host -> address = * address;

	if (! channelLimit || channelLimit > ENET_PROTOCOL_MAXIMUM_CHANNEL_COUNT)
	  channelLimit = ENET_PROTOCOL_MAXIMUM_CHANNEL_COUNT;
	else
	if (channelLimit < ENET_PROTOCOL_MINIMUM_CHANNEL_COUNT)
	  channelLimit = ENET_PROTOCOL_MINIMUM_CHANNEL_COUNT;

	host -> randomSeed = (enet_uint32) time(NULL) + (enet_uint32) (size_t) host;
	host -> randomSeed = (host -> randomSeed << 16) | (host -> randomSeed >> 16);
	host -> channelLimit = channelLimit;
	host -> incomingBandwidth = incomingBandwidth;
	host -> outgoingBandwidth = outgoingBandwidth;
	host -> bandwidthThrottleEpoch = 0;
	host -> recalculateBandwidthLimits = 0;
	host -> mtu = ENET_HOST_DEFAULT_MTU;
	host -> peerCount = peerCount;
	host -> commandCount = 0;
	host -> bufferCount = 0;
	host -> checksum = NULL;
	host -> receivedAddress.host = ENET_HOST_ANY;
	host -> receivedAddress.port = 0;
	host -> receivedData = NULL;
	host -> receivedDataLength = 0;

	host -> totalSentData = 0;
	host -> totalSentPackets = 0;
	host -> totalReceivedData = 0;
	host -> totalReceivedPackets = 0;

	host -> compressor.context = NULL;
	host -> compressor.compress = NULL;
	host -> compressor.decompress = NULL;
	host -> compressor.destroy = NULL;
	host -> isClient = 0;

	enet_list_clear (& host -> dispatchQueue);

	for (currentPeer = host -> peers;
		 currentPeer < & host -> peers [host -> peerCount];
		 ++ currentPeer)
	{
	   currentPeer -> host = host;
	   currentPeer -> incomingPeerID = currentPeer - host -> peers;
	   currentPeer -> outgoingSessionID = currentPeer -> incomingSessionID = 0xFF;
	   currentPeer -> data = NULL;

	   enet_list_clear (& currentPeer -> acknowledgements);
	   enet_list_clear (& currentPeer -> sentReliableCommands);
	   enet_list_clear (& currentPeer -> sentUnreliableCommands);
	   enet_list_clear (& currentPeer -> outgoingReliableCommands);
	   enet_list_clear (& currentPeer -> outgoingUnreliableCommands);
	   enet_list_clear (& currentPeer -> dispatchedCommands);

	   enet_peer_reset (currentPeer);
	}

	return host;
}

ENetHost* jsapi_enet_host_create_server(unsigned int host, int port,int maxpeers, int maxchannels, int bw_down, int bw_up){
	ENetAddress address;
	address.host = host;
	address.port = port;
	ENetSocket sock = enet_socket_create (ENET_SOCKET_TYPE_DATAGRAM);

	return jsapi_enet_host_from_socket (sock,
							   & address     /* the address to bind the server host to */,
							   maxpeers    /* allow up to maxpeers clients and/or outgoing connections */,
							   maxchannels /* allow up to maxchannels channels to be used, 0,1,...maxcahnnels*/,
							   bw_down    /* assume bw_in (Bytes/s) of incoming bandwidth */,
							   bw_up   /* assume bw_out (Bytes/s) of outgoing bandwidth */);
}

ENetHost* jsapi_enet_host_create_client(int maxconn, int maxchannels, int bw_down, int bw_up){
	ENetSocket sock = enet_socket_create (ENET_SOCKET_TYPE_DATAGRAM);
	ENetHost* host = jsapi_enet_host_from_socket (sock,
							   NULL      /*create a client - doesn't accept incoming connections*/,
							   maxconn    /* allow up to maxconn outgoing connections */,
							   maxchannels /* allow up to maxchannels channels to be used, 0 and 1 */,
							   bw_down    /* assume bw_down (Bytes/s) incoming bandwidth */,
							   bw_up   /* assume bw_up (Bytes/s) outgoing bandwidth */);
	host -> isClient = 1;
	return host;
}

//only call this only for servers/custom socket
void
jsapi_enet_host_bind(ENetHost* host){
	if(host != NULL && host -> socket != ENET_SOCKET_NULL){
		   enet_socket_bind (host -> socket, &(host->address));
	}
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

enet_uint32 jsapi_event_get_data(ENetEvent* event){
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

ENetPacketFlag jsapi_packet_flags(ENetPacket *packet){
	return packet -> flags;
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

enet_uint32   jsapi_peer_get_reliableDataInTransit(ENetPeer *peer){
	return peer->reliableDataInTransit;
}
