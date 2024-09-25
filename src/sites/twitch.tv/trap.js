/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 *
 * This script is executed in the MAIN world environment.
 */

import { messagePort } from '../trap.js';

// We need to hook WebSocket very early.
const WebSocketTrap = (target, args) => {
	const res = Reflect.construct(target, args);

	const url = args[0];
	if (!url.startsWith('wss://irc-ws.chat.twitch.tv:443')) {
		return res;
	}

	res.addEventListener('message', e => {
		// We pass the data to the content script.
		messagePort.postMessage(e.data);
	});
	return res;
};
WebSocket = new Proxy(WebSocket, { construct: WebSocketTrap });
