/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

import { userConfigs, messagePortPromise, TextReader } from '../util.js';

(() => {
	const p = new URLSearchParams(location.search);
	if (!p.has('is_popout')) {
		if (userConfigs.popoutOnly) {
			throw "Exit script because popout-only mode is enabled.";
		}
		return;
	}
	const bc = new BroadcastChannel(location.href);
	window.addEventListener('beforeunload', () => {
		bc.postMessage(undefined);
		bc.close();
	});
})();

document.getElementById('chat-messages').addEventListener('yt-action', e => {
	if (e.detail.actionName !== 'yt-popout-live-chat-endpoint') {
		return;
	}

	const obj = e.detail.args[0];
	const onmessageSaved = messagePort.onmessage;
	messagePort.onmessage = undefined;
	const popoutChannel = new BroadcastChannel(obj.popoutLiveChatEndpoint.url);
	popoutChannel.onmessage = () => {
		popoutChannel.close();
		popoutChannel = undefined;
		messagePort.onmessage = onmessageSaved;
	};
});

const audioCtx = new AudioContext({ latencyHint: 'playback' });
const textReader = new TextReader(audioCtx);
const messagePort = await messagePortPromise;

messagePort.onmessage = (() => {
	let prevId = '';
	const parseActionObj = action => {
		if (!('addChatItemAction' in action)) {
			// This might be a pinned message or a poll.
			return;
		}

		const chatItem = action.addChatItemAction.item;
		const messageRenderer
			= chatItem.liveChatTextMessageRenderer
			?? chatItem.liveChatPaidMessageRenderer;

		if (!messageRenderer) {
			console.log(chatItem);
			return;
		}

		if (prevId === messageRenderer.id) {
			// Sometimes a chat message is duplicated.
			return;
		}
		prevId = messageRenderer.id;

		const text = messageRenderer.message.runs.reduce((acc, x) => {
			if (x.text) {
				return acc + x.text;
			} else if (userConfigs.readCustomEmoji) {
				const e = x.emoji.searchTerms[0];
				if (e.startsWith('_')) {
					return acc + ' ' + e.slice(1);
				}
			}
			return acc;
		}, '');

		const authorName = messageRenderer.authorName.simpleText.toLowerCase();
		textReader.readAloud(text, authorName);
	};

	return e => {
		if (!('actions' in e.data)) {
			// There are no new chat messages.
			return;
		}

		// A message block may have multiple chat messages
		// which are in actions object.
		e.data.actions.forEach(parseActionObj);
	};
})();
