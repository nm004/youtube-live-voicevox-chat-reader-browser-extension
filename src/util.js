/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

const userConfigs = await chrome.storage.local.get({
	voicevoxEngineOrigin: 'http://localhost:50021',
	voicevoxSpeakerId: 0,
	audioVolume: 1,
	minPlaybackRate: 1,
	disablePlaybackRateControl: false,
	readCustomEmoji: false,
	popoutOnly: false,
	maxTextLength: 50,
	alternativeText: '',
	blockedAuthors: [],
});
userConfigs.blockedAuthors = new Set(userConfigs.blockedAuthors);

const fetchVoicevoxAudio = async (origin, speakerId, text) => {
	const audioQueryParams = new URLSearchParams([ ['speaker', speakerId], ['text', text] ]);
	const audioQueryReq = new Request(`${origin}/audio_query?${audioQueryParams}`, {method: 'POST'});
	const audioQuery = await fetch(audioQueryReq).then(r => r.json());
	audioQuery.speedScale = 1;
	audioQuery.volumeScale = 1;
	audioQuery.prePhonemeLength = 0;
	audioQuery.postPhonemeLength = 0;
	audioQuery.pauseLength = null;
	audioQuery.pauseLengthScale = 0.5;
	audioQuery.outputStereo = false;
	const synthesisReq = new Request(
		`${origin}/synthesis?speaker=${speakerId}`, {
			method: 'POST',
			body: JSON.stringify(audioQuery),
			headers: { 'Content-Type': 'application/json'}
		});
	return fetch(synthesisReq);
};

export { userConfigs, fetchVoicevoxAudio };
