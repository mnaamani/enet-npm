module.exports.PACKET_FLAG = {
	RELIABLE: 1,
	UNSEQUENCED: 1 << 1,
	UNRELIABLE_FRAGMENT: 1 << 3,
	SENT: (1 << 8)
};
