/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

import { userConfigs, fetchVoicevoxAudio } from '../src/util.js';
import { normalizingGain  } from '../src/reader.js';

chrome.declarativeNetRequest.updateSessionRules({
	addRules: [{
		id: 1,
		condition: {
			urlFilter: "||localhost",
			initiatorDomains: [ location.host ]
		},
		action: {
			type: "modifyHeaders",
			requestHeaders: [{
				header: "Origin",
				operation: "set",
				value: "app://."
			}],
			responseHeaders: [{
				header: "Access-Control-Allow-Origin",
				operation: "set",
				value: location.origin
			}]
		}
	}],
	removeRuleIds: [1]
});

const audio = new Audio();
audio.loop = true;
/*
audio.onended = async e => {
	const playing = playPauseVoiceSampleButton.classList.contains('playing');
	await new Promise(r => setTimeout(() => r(), 150/userConfigs.minPlaybackRate));
	if (playing) {
		audio.play();
	}
};
audio.oncanplaythrough = async e => {
	const playing = playPauseVoiceSampleButton.classList.contains('playing');
	if (playing) {
		audio.play();
	}
};
*/
const audioCtx = new AudioContext({ latencyHint: 'playback' });
const gainNode = new GainNode(audioCtx);
const audioSourceNode = new MediaElementAudioSourceNode(audioCtx, { mediaElement: audio });
audioSourceNode.connect(gainNode).connect(audioCtx.destination);

const speakerSelect = document.getElementById('speakers');
speakerSelect.onchange = e => {
	const voicevoxSpeakerId = Number(speakerSelect.value);
	userConfigs.voicevoxSpeakerId = voicevoxSpeakerId;
	chrome.storage.local.set({ voicevoxSpeakerId });
	updateVoiceSample();
};

const updateVoiceSample = () => {
	const o = speakerSelect.options[speakerSelect.selectedIndex];
	fetchVoicevoxAudio(userConfigs.voicevoxEngineOrigin, userConfigs.voicevoxSpeakerId,
		`こんにちは、${o.dataset.charName}です`).catch(err => {
		connectionErrorDialog.showModal();
		throw err;
	}).then(r => r.blob()
	).then(sampleVoice => {
		URL.revokeObjectURL(audio.src);
		audio.src = URL.createObjectURL(sampleVoice);
		return sampleVoice.arrayBuffer();
	}).then(buf => audioCtx.decodeAudioData(buf)
	).then(audioBuf => {
		const data = audioBuf.getChannelData(0);
		// normalizingGain("こんにちは、四国めたんです" by Shikoku Metan,
		//	 0.125 = -18 dbFS,  0.707 = -3 db)
		// ~= -20 LUFS
		gainNode.gain.value = normalizingGain(data, 0.125, 0.707);
	});
};

const audioVolumeInput = document.getElementById('audio-volume');
audioVolumeInput.onchange = e => {
	if (!audioVolumeInput.value) {
		audioVolumeInput.value = audioVolumeInput.defaultValue;
	}
	else if (audioVolumeInput.validity.rangeUnderflow) {
		audioVolumeInput.value = audioVolumeInput.min;
	}
	else if (audioVolumeInput.validity.rangeOverflow) {
		audioVolumeInput.value = audioVolumeInput.max;
	}
	const audioVolume = 0.01*audioVolumeInput.valueAsNumber;
	audio.volume = audioVolume;
	userConfigs.audioVolume = audioVolume;
	chrome.storage.local.set({ audioVolume });
};

const minPlaybackRateInput = document.getElementById('min-playback-rate');
minPlaybackRateInput.onchange = e => {
	if (!minPlaybackRateInput.value) {
		minPlaybackRateInput.value = minPlaybackRateInput.defaultValue;
	}
	else if (minPlaybackRateInput.validity.rangeUnderflow) {
		minPlaybackRateInput.value = minPlaybackRateInput.min;
	}
	else if (minPlaybackRateInput.validity.rangeOverflow) {
		minPlaybackRateInput.value = minPlaybackRateInput.max;
	}
	const minPlaybackRate = minPlaybackRateInput.valueAsNumber;
	audio.playbackRate = minPlaybackRate;
	audio.defaultPlaybackRate = minPlaybackRate;
	userConfigs.minPlaybackRate = minPlaybackRate;
	chrome.storage.local.set({ minPlaybackRate });
};

audio.onpause = () => {
	playPauseVoiceSampleButton.classList.remove('playing');
}
audio.onplaying = () => {
	playPauseVoiceSampleButton.classList.add('playing');
}
audio.onemptied = () => {
	if (playPauseVoiceSampleButton.classList.contains('playing')) {
		audio.play()
	}
}
const playPauseVoiceSampleButton = document.getElementById('play-pause-voice-sample');
playPauseVoiceSampleButton.onclick = e => {
	if (audio.paused) {
		audio.play();
	} else {
		audio.pause();
		audio.currentTime = 0;
	}
};

const disablePlaybackRateControlInput = document.getElementById('disable-playback-rate-control');
disablePlaybackRateControlInput.onchange = e => {
	chrome.storage.local.set({ disablePlaybackRateControl: disablePlaybackRateControlInput.checked });
};

const readAuthorNameInput= document.getElementById('read-author-name');
readAuthorNameInput.onchange = e => {
	chrome.storage.local.set({ readAuthorName: readAuthorNameInput.checked });
};

const readCustomEmojiInput = document.getElementById('read-custom-emoji');
readCustomEmojiInput.onchange = e => {
	chrome.storage.local.set({ readCustomEmoji: readCustomEmojiInput.checked });
};

const popoutOnlyInput = document.getElementById('popout-only');
popoutOnlyInput.onchange = e => {
	chrome.storage.local.set({ popoutOnly: popoutOnlyInput.checked });
};

const maxTextLengthInput = document.getElementById('max-text-length');
maxTextLengthInput.onchange = e => {
	if (!maxTextLengthInput.value) {
		maxTextLengthInput.value = maxTextLengthInput.defaultValue;
	}
	else if (maxTextLengthInput.validity.rangeUnderflow) {
		maxTextLengthInput.value = maxTextLengthInput.min;
	}
	else if (maxTextLengthInput.validity.rangeOverflow) {
		maxTextLengthInput.value = maxTextLengthInput.max;
	}
	chrome.storage.local.set({ maxTextLength: maxTextLengthInput.valueAsNumber });
};

const alternativeTextArea = document.getElementById('alternative-text');
alternativeTextArea.onchange = e => {
	chrome.storage.local.set({ alternativeText: alternativeTextArea.value });
};

const blockedAuthorsSelect = document.getElementById('blocked-authors');
blockedAuthorsSelect.onkeydown = e => {
	if (e.key === 'Delete') {
		deleteBlockedAuthorInput.click();
	}
};

const deleteBlockedAuthorInput = document.getElementById('delete-blocked-author');
deleteBlockedAuthorInput.onclick = () => {
	const O = blockedAuthorsSelect.selectedOptions;
	if (!O.length) {
		return;
	}
	for (const o of Array.from(O)) {
		o.remove();
		userConfigs.blockedAuthors.delete(o.text);
	}

	const blockedAuthors = Array.from(userConfigs.blockedAuthors);
	chrome.storage.local.set({ blockedAuthors });
};

const newBlockedAuthorInput = document.getElementById('new-blocked-author');
newBlockedAuthorInput.onkeydown = e => {
	if (e.key === 'Enter') {
		addBlockedAuthorInput.click();
	}
};

const addBlockedAuthorInput = document.getElementById('add-blocked-author');
addBlockedAuthorInput.onclick = () => {
	if (!newBlockedAuthorInput.value) {
		return;
	}
	else if (newBlockedAuthorInput.validity.patternMismatch) {
		return;
	}

	const newBlockedAuthor = newBlockedAuthorInput.value.toLowerCase();
	if (userConfigs.blockedAuthors.has(newBlockedAuthor)) {
		blockedAuthorsSelect.querySelector(`option[value="${newBlockedAuthor}"]`).remove();
	}
	userConfigs.blockedAuthors.add(newBlockedAuthor)
	newBlockedAuthorInput.value = '';

	const o = document.createElement('option');
	o.text = o.value = newBlockedAuthor;
	blockedAuthorsSelect.prepend(o);

	const blockedAuthors = Array.from(userConfigs.blockedAuthors);
	chrome.storage.local.set({ blockedAuthors });
};

const voicevoxEnginePortInput = document.getElementById('voicevox-engine-port');
voicevoxEnginePortInput.onchange = e => {
	if (!voicevoxEnginePortInput.value) {
		voicevoxEnginePortInput.value = voicevoxEnginePortInput.defaultValue;
	}
	else if (voicevoxEnginePortInput.validity.rangeUnderflow) {
		maxTextLengthInput.value = maxTextLengthInput.min;
	}
	else if (voicevoxEnginePortInput.validity.rangeOverflow) {
		maxTextLengthInput.value = maxTextLengthInput.max;
	}
	const voicevoxEnginePort = new URL(`http://localhost:${voicevoxEnginePortInput.value}`).origin;
	userConfigs.voicevoxEnginePort = voicevoxEnginePort;
	chrome.storage.local.set({ voicevoxEnginePort });
};

const reconnectInput = document.getElementById('reconnect');
reconnectInput.onclick = () => { window.location.reload(); };

const connectionErrorDialog = document.getElementById('connection-error');

// Init configurations
(() => {
	fetch(`${userConfigs.voicevoxEngineOrigin}/speakers`).catch(e => {
		connectionErrorDialog.showModal();
		throw e;
	}).then(r => r.json()
	).then(obj => {
		for (const s of obj) {
			for (const t of s.styles) {
				if (t.type !== 'talk') {
					continue;
				}
				const o = document.createElement('option');
				o.value = t.id;
				o.text = `${s.name} - ${t.name}`;
				o.dataset.charName = s.name;
				speakerSelect.appendChild(o);
			}
		}
		speakerSelect.value = userConfigs.voicevoxSpeakerId;
		updateVoiceSample();
	});

	audioVolumeInput.value = Math.round(100*userConfigs.audioVolume);
	minPlaybackRateInput.value = userConfigs.minPlaybackRate;
	audio.volume = userConfigs.audioVolume;
	audio.defaultPlaybackRate = userConfigs.minPlaybackRate;
	disablePlaybackRateControlInput.checked = userConfigs.disablePlaybackRateControl;
	readAuthorNameInput.checked = userConfigs.readAuthorName;
	readCustomEmojiInput.checked = userConfigs.readCustomEmoji;
	popoutOnlyInput.checked = userConfigs.popoutOnly;
	maxTextLengthInput.value = userConfigs.maxTextLength;
	alternativeTextArea.value = userConfigs.alternativeText;
	for (const b of userConfigs.blockedAuthors) {
		const o = document.createElement('option');
		o.text = o.value = b;
		blockedAuthorsSelect.appendChild(o);
	}
	voicevoxEnginePortInput.value = new URL(userConfigs.voicevoxEngineOrigin).port;
})();
