/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 *
 * This script is executed in the MAIN world environment.
 */
import { messagePort } from '../trap.js';

const fetchOrig = fetch;
fetch = (...args) => {
	const res = fetchOrig(...args);

	const chatApi = `${location.origin}/youtubei/v1/live_chat`;
	const url = args[0] instanceof Request ? args[0].url : args[0];
	if (url.startsWith(`${chatApi}/get_live_chat`)) {
		res.then(r => r.clone().json()).then(obj => {
			// We pass the data to the content script.
			const c = obj.continuationContents.liveChatContinuation;
			messagePort.postMessage(c);
		});
	}
	// else if (req.toString().startsWith(`${chatApi}/send_message`)) { }

	return res;
};
