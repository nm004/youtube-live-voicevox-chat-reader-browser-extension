/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

import { userConfigs, fetchVoicevoxAudio } from '../util.js';
import { TextReader } from '../reader.js';

class VoicevoxTextReader extends TextReader {
	async generateAudioData(text) {
		const response = await fetchVoicevoxAudio(userConfigs.voicevoxEngineOrigin,
			userConfigs.voicevoxSpeakerId, text);
		return response.blob();
	}

	constructor(audioCtx) {
		super(audioCtx);

		const o = userConfigs.voicevoxEngineOrigin;
		const s = userConfigs.voicevoxSpeakerId;
		fetch(`${o}/initialize_speaker?speaker=${s}&skip_reinit=true`, { method: 'POST' });

		this.audio.volume = userConfigs.audioVolume;
		this.minPlaybackRate = userConfigs.minPlaybackRate;
		this.maxPlaybackRate = userConfigs.disablePlaybackRateControl
			? this.minPlaybackRate
			: Math.SQRT2*this.minPlaybackRate;
	}

	async readAloud(text, authorName) {
		if (!text) {
			return;
		}

		if (userConfigs.blockedAuthors.has(authorName)) {
			return;
		}

		if (text.length > userConfigs.maxTextLength) {
			text = text.slice(0, userConfigs.maxTextLength) + ' ' + userConfigs.alternativeText;
		}

		if (userConfigs.readAuthorName) {
			text = authorName + 'さん ' + text
		}

		super.readAloud(text);
	};
};

const messagePortPromise = (async () => {
	let port;
	let resolve;
	const promise = new Promise(r => { resolve = r });
	const onMessage = async e => {
		if (e.source !== window) {
			return;
		}
		if (!e.ports[0]) {
			return;
		}
		window.removeEventListener('message', onMessage);
		port = e.ports[0];
		resolve();
	};
	window.addEventListener('message', onMessage);
	window.postMessage(undefined, location.origin);
	await promise;
	return port;
})();

export { userConfigs, VoicevoxTextReader as TextReader, messagePortPromise };
