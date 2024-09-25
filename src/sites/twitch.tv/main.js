/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

import { userConfigs, TextReader, messagePortPromise } from '../util.js';

(() => {
	const p = new URLSearchParams(location.search);
	if (!p.has('popout')) {
		if (userConfigs.popoutOnly) {
			throw "Exit script because popout-only mode is enabled.";
		}
		return;
	}
})();

const audioCtx = new AudioContext({ latencyHint: 'playback' });
const textReader = new TextReader(audioCtx);
const messagePort = await messagePortPromise;

messagePort.onmessage = e => {
	// Data is an IRCv3 message tag.
	const msg = e.data.split(' ');

	// tags
	const tags = (() => {
		if (!msg[0].startsWith('@')) {
			return;
		}
		return new URLSearchParams(msg.shift().substring(1).split(';').join('&'));
	})();

	// prefix/source
	const prefix = (() => {
		if (!msg[0].startsWith(':')) {
			return;
		}
		return msg.shift().substring(1);
	})();

	// command
	if (msg[0] !== 'PRIVMSG') {
		return;
	}
	msg.shift();

	// parameters
	while (!msg[0].startsWith(':')) {
		// && msg.length > 1
		msg.shift();
	}

	const text = (() => {
		const text = msg.join(' ').substring(1);
		if (userConfigs.readCustomEmoji) {
			return text;
		}

		if (tags.has('emote-only')) {
			return '';
		}

		const emotes = tags.get('emotes');
		if (!emotes) {
			return text;
		}

		const offsets = emotes.split('/').flatMap(x =>
			x.substring(x.lastIndexOf(':')+1).split(',').map(x =>
				x.split('-').map(Number)
			)
		);
		offsets.sort((a, b) => a[0] - b[0]);
		let textNoEmotes = text;
		let x = 0;
		for (const [ o0, o1 ] of offsets) {
			textNoEmotes = textNoEmotes.substring(0, o0-x)
				+ textNoEmotes.substring(o1-x+1);
			x += o1-o0+1;
		}
		return textNoEmotes;
	})().trim();

	const authorName = prefix.substring(0, prefix.indexOf('!'));
	textReader.readAloud(text, authorName);
};
