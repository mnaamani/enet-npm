var Module;
this["Module"] = Module = {
	"preRun": function () {
		Module["jsapi"] = {};
		Module["jsapi"]["init"] = cwrap('jsapi_init', '', ['number']);
		Module["jsapi"]["enet_host_create_client"] = cwrap('jsapi_enet_host_create_client', 'number', ['number',
			'number',
			'number', 'number'
		]);
		Module["jsapi"]["enet_host_create_server"] = cwrap('jsapi_enet_host_create_server', 'number', ['number',
			'number',
			'number', 'number', 'number', 'number'
		]);
		Module["jsapi"]["enet_host_from_socket"] = cwrap('jsapi_enet_host_from_socket', 'number', ['number',
			'number', 'number',
			'number', 'number', 'number', 'number'
		]);
		Module["jsapi"]["enet_host_bind"] = cwrap('jsapi_enet_host_bind', '', ['number']);
		Module["jsapi"]["host_get_socket"] = cwrap('jsapi_host_get_socket', "number", ['number']);
		Module["jsapi"]["host_get_receivedAddress"] = cwrap("jsapi_host_get_receivedAddress", 'number', [
			'number'
		]);
		Module["jsapi"]["enet_host_connect"] = cwrap("jsapi_enet_host_connect", "number", ['number', 'number',
			'number',
			'number', 'number'
		]);
		Module["jsapi"]["packet_get_data"] = cwrap("jsapi_packet_get_data", "number", ["number"]);
		Module["jsapi"]["packet_set_free_callback"] = cwrap("jsapi_packet_set_free_callback", "", ["number",
			"number"
		]);
		Module["jsapi"]["packet_get_dataLength"] = cwrap("jsapi_packet_get_dataLength", "number", ["number"]);
		Module["jsapi"]["packet_flags"] = cwrap("jsapi_packet_flags", "number", ["number"]);
		Module["jsapi"]["event_new"] = cwrap('jsapi_event_new', 'number', []);
		Module["jsapi"]["event_free"] = cwrap('jsapi_event_free', '', ['number']);
		Module["jsapi"]["event_get_type"] = cwrap('jsapi_event_get_type', 'number', ['number']);
		Module["jsapi"]["event_get_peer"] = cwrap('jsapi_event_get_peer', 'number', ['number']);
		Module["jsapi"]["event_get_packet"] = cwrap('jsapi_event_get_packet', 'number', ['number']);
		Module["jsapi"]["event_get_data"] = cwrap('jsapi_event_get_data', 'number', ['number']);
		Module["jsapi"]["event_get_channelID"] = cwrap('jsapi_event_get_channelID', 'number', ['number']);
		Module["jsapi"]["address_get_host"] = cwrap('jsapi_address_get_host', 'number', ['number']);
		Module["jsapi"]["address_get_port"] = cwrap('jsapi_address_get_port', 'number', ['number']);
		Module["jsapi"]["peer_get_address"] = cwrap('jsapi_peer_get_address', 'number', ['number']);
		Module["jsapi"]["peer_get_state"] = cwrap('jsapi_peer_get_state', 'number', ['number']);
		Module["jsapi"]["peer_get_incomingDataTotal"] = cwrap('jsapi_peer_get_incomingDataTotal', 'number', [
			'number'
		]);
		Module["jsapi"]["peer_get_outgoingDataTotal"] = cwrap('jsapi_peer_get_outgoingDataTotal', 'number', [
			'number'
		]);

		Module["jsapi"]["peer_get_reliableDataInTransit"] = cwrap('jsapi_peer_get_reliableDataInTransit',
			'number', [
				'number'
			]);
		Module["libenet"] = {};
		Module["libenet"]["host_service"] = cwrap("enet_host_service", 'number', ['number', 'number', 'number']);
		Module["libenet"]["host_destroy"] = cwrap("enet_host_destroy", '', ['number']);
		Module["libenet"]["host_flush"] = cwrap('enet_host_flush', "", ['number']);
		Module["libenet"]["host_bandwidth_throttle"] = cwrap('enet_host_bandwidth_throttle', "", ['number']);
		Module["libenet"]["host_broadcast"] = cwrap('enet_host_broadcast', "", ['number', 'number', 'number']);
		Module["libenet"]["host_compress_with_range_coder"] = cwrap('enet_host_compress_with_range_coder',
			"number", [
				'number'
			]);
		Module["libenet"]["host_compress"] = cwrap('enet_host_compress', "", ['number', 'number']);
		Module["libenet"]["packet_create"] = cwrap("enet_packet_create", "number", ['number', 'number',
			'number'
		]);
		Module["libenet"]["packet_destroy"] = cwrap("enet_packet_destroy", '', ['number']);
		Module["libenet"]["peer_send"] = cwrap('enet_peer_send', 'number', ['number', 'number', 'number']);
		Module["libenet"]["peer_reset"] = cwrap('enet_peer_reset', '', ['number']);
		Module["libenet"]["peer_ping"] = cwrap('enet_peer_ping', '', ['number']);
		Module["libenet"]["peer_disconnect"] = cwrap('enet_peer_disconnect', '', ['number', 'number']);
		Module["libenet"]["peer_disconnect_now"] = cwrap('enet_peer_disconnect_now', '', ['number', 'number']);
		Module["libenet"]["peer_disconnect_later"] = cwrap('enet_peer_disconnect_later', '', ['number',
			'number'
		]);

		Module["Runtime_addFunction"] = Runtime.addFunction;
		Module["Runtime_removeFunction"] = Runtime.removeFunction;
		Module["HEAPU8"] = HEAPU8;
		Module["HEAPU32"] = HEAPU32;
	}
};
