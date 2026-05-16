"use client";

let liveRouteActive = false;
let liveMutedForQuran = false;
let savedLiveUserMuted = false;

async function liveMod() {
  return import("@/lib/live-dual-prewarm");
}

async function quranMod() {
  return import("@/lib/quran-audio-player");
}

async function adhanMod() {
  return import("@/lib/prayer-adhan");
}

/** @param {boolean} active */
export function setLiveRouteActive(active) {
  liveRouteActive = Boolean(active);
}

export function isLiveRouteActive() {
  return liveRouteActive;
}

/** For tests */
export function resetAudioFocusForTests() {
  liveRouteActive = false;
  liveMutedForQuran = false;
  savedLiveUserMuted = false;
}

export async function onLiveRouteEnter() {
  const q = await quranMod();
  const state = q.getQuranAudioState();
  if (state.status === "playing" || state.status === "paused") {
    q.pauseQuranAudio();
  }
}

export async function beforeQuranPlayback() {
  const adhan = await adhanMod();
  adhan.stopPrayerAdhan();
  const live = await liveMod();
  if (liveRouteActive) {
    savedLiveUserMuted = live.getLiveDualUserMuted();
    live.setLiveDualUserMuted(true);
    liveMutedForQuran = true;
  } else {
    live.pauseLiveDualPrewarm();
  }
}

export async function afterQuranPlaybackEnd() {
  const live = await liveMod();
  if (liveMutedForQuran) {
    live.setLiveDualUserMuted(savedLiveUserMuted);
    liveMutedForQuran = false;
  } else if (!liveRouteActive) {
    live.resumeLiveDualPrewarm();
  }
}

export async function beforeAdhanPlayback() {
  const q = await quranMod();
  const state = q.getQuranAudioState();
  if (state.status === "playing" || state.status === "paused") {
    q.pauseQuranAudio();
  }
  liveMutedForQuran = false;
  const live = await liveMod();
  live.pauseLiveDualPrewarm();
}
