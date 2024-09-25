/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

const src = chrome.runtime.getURL('src/sites/twitch.tv/main.js');
import(src);

const observer = new MutationObserver(mutationList => {
	observer.disconnect();
	const script = document.createElement('script');
	script.type = 'module';
	script.async = true;
	script.src = chrome.runtime.getURL('src/sites/twitch.tv/trap.js');
	document.head.appendChild(script);
});
observer.observe(document.documentElement, { childList: true });
