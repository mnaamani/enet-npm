/** 
 @file callbacks.c
 @brief ENet callback functions
*/
#define ENET_BUILDING_LIB 1
#include "enet/enet.h"

static ENetCallbacks callbacks = { malloc, free, abort, NULL };

int
enet_initialize_with_callbacks (ENetVersion version, const ENetCallbacks * inits)
{
   if (version < ENET_VERSION_CREATE (1, 3, 0))
     return -1;

   if (inits -> malloc != NULL || inits -> free != NULL)
   {
      if (inits -> malloc == NULL || inits -> free == NULL)
        return -1;

      callbacks.malloc = inits -> malloc;
      callbacks.free = inits -> free;
   }

   if (inits -> no_memory != NULL)
     callbacks.no_memory = inits -> no_memory;

   if (inits -> packet_filter != NULL)
     callbacks.packet_filter = inits -> packet_filter;

   return enet_initialize ();
}

void *
enet_malloc (size_t size)
{
   void * memory = callbacks.malloc (size);

   if (memory == NULL)
     callbacks.no_memory ();

   return memory;
}

void
enet_free (void * memory)
{
   callbacks.free (memory);
}

/*
  return value 0 means drop the packet.
  any other value means continue processing the packet.
*/
int
enet_packet_filter (ENetHost *host){
  if(host->receivedDataLength <= 0) return 1;//can't process a 0 or -ve length packet!

  if(callbacks.packet_filter != NULL){
    //packet filter can modify buffer - (better to pass a copy?)
    return callbacks.packet_filter(host);
  }
  //no packet filter is defined - continue processing
  return 1;
}
