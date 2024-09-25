/*
 * This file is a part of Youtube Live VOICEVOX Chat Reader by Nozomi Miyamori.
 * Youtube Live VOICEVOX Chat Reader is distributed under CC0 1.0 and the Public Domain.
 */

const src = chrome.runtime.getURL('src/sites/youtube.com/main.js');
import(src);

const script = document.createElement('script');
script.type = 'module';
script.async = true;
script.src = chrome.runtime.getURL('src/sites/youtube.com/trap.js');
document.head.appendChild(script);
