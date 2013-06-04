/*
 * This should go into emscripten's system/include/sys/socket.h
 */

#ifndef __BITS_SOCKET_H
#define __BITS_SOCKET_H

/* Bits in the FLAGS argument to `send', `recv', et al.  */
enum
  {
    MSG_OOB     = 0x01, /* Process out-of-band data.  */
#define MSG_OOB     MSG_OOB
    MSG_PEEK        = 0x02, /* Peek at incoming messages.  */
#define MSG_PEEK    MSG_PEEK
    MSG_DONTROUTE   = 0x04, /* Don't use local routing.  */
#define MSG_DONTROUTE   MSG_DONTROUTE
    MSG_CTRUNC      = 0x08, /* Control data lost before delivery.  */
#define MSG_CTRUNC  MSG_CTRUNC
    MSG_PROXY       = 0x10, /* Supply or ask second address.  */
#define MSG_PROXY   MSG_PROXY
    MSG_TRUNC       = 0x20,
#define MSG_TRUNC   MSG_TRUNC
    MSG_DONTWAIT    = 0x40, /* Nonblocking IO.  */
#define MSG_DONTWAIT    MSG_DONTWAIT
    MSG_EOR     = 0x80, /* End of record.  */
#define MSG_EOR     MSG_EOR
    MSG_WAITALL     = 0x100, /* Wait for a full request.  */
#define MSG_WAITALL MSG_WAITALL
    MSG_FIN     = 0x200,
#define MSG_FIN     MSG_FIN
    MSG_SYN     = 0x400,
#define MSG_SYN     MSG_SYN
    MSG_CONFIRM     = 0x800, /* Confirm path validity.  */
#define MSG_CONFIRM MSG_CONFIRM
    MSG_RST     = 0x1000,
#define MSG_RST     MSG_RST
    MSG_ERRQUEUE    = 0x2000, /* Fetch message from error queue.  */
#define MSG_ERRQUEUE    MSG_ERRQUEUE
    MSG_NOSIGNAL    = 0x4000, /* Do not generate SIGPIPE.  */
#define MSG_NOSIGNAL    MSG_NOSIGNAL
    MSG_MORE        = 0x8000,  /* Sender will send more.  */
#define MSG_MORE    MSG_MORE
    MSG_WAITFORONE  = 0x10000, /* Wait for at least one packet to return.*/
#define MSG_WAITFORONE  MSG_WAITFORONE
    MSG_FASTOPEN    = 0x20000000, /* Send data in TCP SYN.  */
#define MSG_FASTOPEN    MSG_FASTOPEN

    MSG_CMSG_CLOEXEC    = 0x40000000    /* Set close_on_exit for file
                       descriptor received through
                       SCM_RIGHTS.  */
#define MSG_CMSG_CLOEXEC MSG_CMSG_CLOEXEC
  };

#endif
