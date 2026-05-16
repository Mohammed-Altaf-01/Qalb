"use client";

import { stopQuranAudio } from "@/lib/quran-audio-player";

export const ADHAN_SRC = "/adhan.mp3";
export const ADHAN_ENABLED_KEY = "qalb_adhan_enabled";

/** @type {ReturnType<typeof setTimeout> | null} */
let timerId = null;
/** @type {HTMLAudioElement | null} */
let adhanAudio = null;
/** @type {((playing: boolean) => void) | null} */
let onPlayingChange = null;

function emitPlaying(playing) {
  onPlayingChange?.(playing);
}

function ensureAdhanAudio() {
  if (!adhanAudio) {
    adhanAudio = new Audio(ADHAN_SRC);
    adhanAudio.preload = "auto";
    adhanAudio.addEventListener("ended", () => emitPlaying(false));
    adhanAudio.addEventListener("pause", () => {
      if (adhanAudio?.paused) emitPlaying(false);
    });
  }
  return adhanAudio;
}

/** @returns {string} */
function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * @param {string} prayerName
 * @returns {boolean}
 */
function wasFiredToday(prayerName) {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(`qalb_adhan_fired_${todayKey()}_${prayerName}`) === "1";
}

/** @param {string} prayerName */
function markFiredToday(prayerName) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`qalb_adhan_fired_${todayKey()}_${prayerName}`, "1");
}

export function isAdhanPlaying() {
  return Boolean(adhanAudio && !adhanAudio.paused && !adhanAudio.ended);
}

/** @returns {boolean} */
export function isAdhanEnabled() {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(ADHAN_ENABLED_KEY) !== "0";
}

/** @param {boolean} on */
export function setAdhanEnabled(on) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ADHAN_ENABLED_KEY, on ? "1" : "0");
  }
  if (!on) stopPrayerAdhan();
}

export async function playPrayerAdhan() {
  stopQuranAudio();
  const a = ensureAdhanAudio();
  try {
    a.currentTime = 0;
    await a.play();
    emitPlaying(true);
  } catch {
    emitPlaying(false);
  }
}

export function stopPrayerAdhan() {
  if (!adhanAudio) return;
  adhanAudio.pause();
  adhanAudio.currentTime = 0;
  emitPlaying(false);
}

/**
 * @param {Array<{ name: string, at: Date }>} slots
 * @param {{ onFire: (name: string) => void, onPlayingChange?: (playing: boolean) => void }} handlers
 * @returns {() => void}
 */
export function schedulePrayerAdhan(slots, { onFire, onPlayingChange: onPlayChange }) {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  onPlayingChange = onPlayChange ?? null;

  const nowMs = Date.now();
  const upcoming = slots.find((s) => s.at.getTime() > nowMs);
  if (!upcoming) return () => {};

  const delay = Math.max(0, upcoming.at.getTime() - nowMs);
  const prayerName = upcoming.name;

  timerId = setTimeout(() => {
    timerId = null;
    if (wasFiredToday(prayerName)) return;
    markFiredToday(prayerName);

    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (!isAdhanEnabled()) return;

    onFire(prayerName);
    void playPrayerAdhan();
  }, delay);

  return () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    onPlayingChange = null;
  };
}
