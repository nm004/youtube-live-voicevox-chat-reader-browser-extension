/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 *
 * This script is executed in the MAIN world environment.
 */

const { port1: messagePort, port2: messagePort2 } = new MessageChannel();
const onMessage = e => {
	if (e.ports[0]) {
		return;
	}
	window.removeEventListener('message', onMessage);
	window.postMessage(undefined, location.origin, [messagePort2]);
};
window.addEventListener('message', onMessage);

export { messagePort };
