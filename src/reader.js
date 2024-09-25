/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

const rms = data => Math.sqrt(data.reduce((acc, x) => acc + x*x, 0) / data.length);

// This calculates RMS of data that passes the gate that is similar to the gate defined
// in ITU-R BS.1770, though our gate does not take the K-filter into account.
const filteredRms = data => {
	// x > -60db
	const data1 = data.filter(x => x > 0.001)
	// a = -20db + Rms(data1)
	const a = 0.1 * rms(data1)
	return rms(data1.filter(x => x > a));
};

const findPeak = data => {
	let peak2 = 0;
	for (const x of data) {
		const x2 = x*x;
		if (x2 > peak2) {
			peak2 = x2;
		}
	}
	return Math.sqrt(peak2);
};

const normalizingGain = (data, targetRmsGain, targetPeakGain) => {
	// peakGain is for making the gain not to exceed the peak.
	const rmsGain = targetRmsGain / filteredRms(data);
	const peakGain = targetPeakGain / findPeak(data);
	return Math.min(rmsGain, peakGain);
};

class Mutex {
	#queue = [];
	#inUse = false;
	#ptr = 0;

	enter() {
		return new Promise(r => {
			if (this.#inUse) {
				this.#queue.push(r);
			} else {
				this.#inUse = true;
				r();
			}
		});
	}

	leave() {
		if (this.#ptr < this.#queue.length) {
			this.#queue[this.#ptr++]();
		} else {
			this.#inUse = false
			this.#queue.length = this.#ptr = 0;
		}
	}

	get length() {
		return this.#queue.length - this.#ptr;
	}
}

class TextReader {
	audio = new Audio();

	minPlaybackRate = 1;
	maxPlaybackRate = Math.SQRT2;

	#audioCtx;
	#gainNode;
	#audioSourceNode;

	#prevTime = 0;
	#duration = 0; // seconds
	#duration1 = 0;

	#mutex0 = new Mutex();
	#mutex1 = new Mutex();

	constructor(audioCtx) {
		this.#audioCtx = audioCtx;
		this.#gainNode = new GainNode(this.#audioCtx, { gain: 0 });
		this.#audioSourceNode
			= new MediaElementAudioSourceNode(this.#audioCtx, { mediaElement: this.audio });
		this.#audioSourceNode.connect(this.#gainNode).connect(this.#audioCtx.destination);
		this.audio.autoplay = true;
		this.audio.defaultMuted = false;
		this.audio.addEventListener('playing', () => { this.#audioCtx.resume(); }, { once: true });
	}

	async generateAudioData(text) {
		throw new Error("", { cause: "NotImplemented" });
	}

	#promiseAudioEvent(e) {
		return new Promise(r => this.audio.addEventListener(e, r, { once: true }));
	}

	async readAloud(text) {
		const q_length0 = this.#mutex0.length + this.#mutex1.length;

		// Wait until the preceding text has been processed.
		await this.#mutex0.enter();

		// We prioritize the most recent message when some messages are in the queue.
		const q_length1 = this.#mutex0.length + this.#mutex1.length
		if (q_length1 > q_length0 && q_length1 > 3) {
			this.#mutex0.leave();
			return;
		}

		this.#duration -= this.audio.currentTime - this.#prevTime;
		this.#prevTime = this.audio.currentTime;
		const durationThreshold = 10;
		if (this.#duration > durationThreshold) {
			// The reader has been unable to follow the recent chat history,
			// so let's skip the messages.
			this.#mutex0.leave();
			return;
		}

		const prepareAudioStartTime = performance.now();
		const [ audioData, audioBuffer ] = await (async () => {
			try {
				const audioData = await this.generateAudioData(text);
				const audioBuffer = await audioData.arrayBuffer()
					.then(buf => this.#audioCtx.decodeAudioData(buf))
				return [ audioData, audioBuffer ];
			} catch (err) {
				this.#mutex0.leave();
				throw err;
			}
		})();
		const gain = (() => {
			const data = audioBuffer.getChannelData(0);
			return normalizingGain(data, 0.125, 0.707);
		})();
		const prepareAudioDuration = 0.001*(performance.now() - prepareAudioStartTime);

		const duration0 = this.#duration;
		this.#duration += audioBuffer.duration + prepareAudioDuration;

		this.#mutex0.leave();

		// Next, we wait until the currently playing audio ends.
		await this.#mutex1.enter();

		const duration = this.#duration;
		const duration2 = this.#duration1;
		// Let's calculate the backward difference:
		// y0 - y2 / h
		//
		// Here, consider the audio data is divided into small time frames.
		// Therefore, let,
		// c0 = duration0
		// c2 = duration2
		// cr = 1/120 = 0.0083
		// y0 = h*cr*c1
		// y2 = h*cr*c2
		// h is constant over the time.
		//
		// thus,
		// (y0 - y2) / h
		// = (h*cr*c0 - h*cr*c2) / h
		// = h*cr*(c0-c2) / h
		// = cr*(c0-c2)
		// = cr*(c0-c2)
		this.audio.defaultPlaybackRate = (() => {
			// 1/60 ~= 0.0167
			const k = this.minPlaybackRate * 0.0167;
			const r = this.audio.defaultPlaybackRate + k * (duration + duration0 - duration2);
			return Math.max(Math.min(r, this.maxPlaybackRate), this.minPlaybackRate);
		})();

		this.#gainNode.gain.value = gain;

		const ended = this.#promiseAudioEvent('ended');
		this.audio.src = URL.createObjectURL(audioData);
		await ended;

		URL.revokeObjectURL(this.audio.src);
		this.#duration -= this.audio.currentTime - this.#prevTime + prepareAudioDuration
		this.#duration1 = this.#duration;
		this.audio.currentTime = this.#prevTime = 0;

		if (this.#mutex0.length + this.#mutex1.length === 1) {
			this.audio.defaultPlaybackRate = this.minPlaybackRate;
			this.#duration = this.#duration1 = 0;
		}

		// Wait for a bit before reading the next.
		const delay = 150 * (this.#mutex0.length + this.#mutex1.length > 1)
			/ this.audio.defaultPlaybackRate;
		await new Promise(r => setTimeout(r, delay));

		this.#mutex1.leave();
	}
};

export { normalizingGain, TextReader };
