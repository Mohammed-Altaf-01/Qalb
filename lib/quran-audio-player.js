"use client";

const listeners = new Set();

let state = {
  mode: "idle", // idle | radio | listen
  status: "idle", // idle | loading | playing | paused | error
  reciterId: null,
  reciterName: "",
  surahId: null,
  verseNum: null,
  label: "",
  error: "",
  streamUrl: "",
};

let audio = null;
let jobId = 0;
let maxVerse = null;

function pauseLiveDualForAudio() {
  if (typeof window === "undefined") return;
  void import("@/lib/live-dual-prewarm").then((m) => m.pauseLiveDualPrewarm()).catch(() => {});
}

function resumeLiveDualAfterAudio() {
  if (typeof window === "undefined") return;
  void import("@/lib/live-dual-prewarm").then((m) => m.resumeLiveDualPrewarm()).catch(() => {});
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    try {
      audio.crossOrigin = "anonymous";
    } catch {
      /* ignore */
    }
    audio.addEventListener("ended", () => {
      if (state.streamUrl) {
        stopQuranAudio();
        return;
      }
      void playNext();
    });
  }
  return audio;
}

function emit() {
  for (const l of listeners) l(state);
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

async function fetchVerseAudio(verseKey, reciterId) {
  const res = await fetch(`/api/verse/audio?key=${encodeURIComponent(verseKey)}&reciter=${reciterId}&segments=false`);
  if (!res.ok) throw new Error(`audio ${res.status}`);
  const data = await res.json();
  if (!data?.audioUrl) throw new Error("audio missing");
  return data.audioUrl;
}

async function playNext() {
  if (state.status === "idle" || state.surahId == null || state.reciterId == null || state.verseNum == null) return;
  if (maxVerse != null && state.verseNum >= maxVerse) {
    stopQuranAudio();
    return;
  }
  const nextVerse = (state.verseNum ?? 0) + 1;
  const jid = jobId;
  const verseKey = `${state.surahId}:${nextVerse}`;
  setState({ status: "loading", verseNum: nextVerse, error: "" });
  try {
    const url = await fetchVerseAudio(verseKey, state.reciterId);
    if (jid !== jobId) return;
    const a = ensureAudio();
    a.src = url;
    await a.play();
    if (jid !== jobId) return;
    setState({ status: "playing", error: "" });
  } catch (e) {
    if (jid !== jobId) return;
    setState({ status: "error", error: e?.message ?? "Could not continue playback" });
    stopQuranAudio();
  }
}

export function subscribeQuranAudio(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getQuranAudioState() {
  return state;
}

export async function startQuranAudio({
  mode,
  reciterId,
  reciterName,
  surahId,
  startVerse = 1,
  surahName,
  maxVerseNum = null,
}) {
  const a = ensureAudio();
  pauseLiveDualForAudio();
  jobId += 1;
  maxVerse = maxVerseNum;
  setState({
    mode,
    status: "loading",
    reciterId,
    reciterName: reciterName ?? "",
    surahId,
    verseNum: startVerse,
    label: `${surahName ? `${surahName} ` : `Surah ${surahId} `}· ${reciterName ?? reciterId}`,
    error: "",
    streamUrl: "",
  });
  try {
    const verseKey = `${surahId}:${startVerse}`;
    const url = await fetchVerseAudio(verseKey, reciterId);
    if (!url) throw new Error("No URL");
    a.src = url;
    await a.play();
    setState({ status: "playing" });
  } catch (e) {
    setState({ status: "error", error: e?.message ?? "Could not start playback" });
    stopQuranAudio();
  }
}

export async function startExternalQuranAudio({ mode, label, url, reciterName = "", surahId = null }) {
  const a = ensureAudio();
  pauseLiveDualForAudio();
  jobId += 1;
  const myJob = jobId;
  maxVerse = null;
  /** @param {string} msg */
  const onStreamError = (msg) => {
    if (myJob !== jobId) return;
    setState({ status: "error", error: msg || "Stream failed" });
    stopQuranAudio();
  };

  a.onerror = () => onStreamError(a.error ? `Media error (${a.error.code})` : "Stream error");
  a.onstalled = () => {
    /* Shoutcast/Icecast often idle between bursts — don't treat as fatal */
  };

  setState({
    mode,
    status: "loading",
    reciterId: null,
    reciterName,
    surahId,
    verseNum: null,
    label: label || "Quran audio",
    error: "",
    streamUrl: url || "",
  });
  try {
    a.src = url;
    await a.play();
    if (myJob !== jobId) return;
    setState({ status: "playing" });
  } catch (e) {
    onStreamError(e?.message ?? "Playback blocked or stream unavailable");
  }
}

export function pauseQuranAudio() {
  if (!audio) return;
  audio.pause();
  if (state.status === "playing") setState({ status: "paused" });
}

export async function resumeQuranAudio() {
  const a = ensureAudio();
  if (!a.src) return;
  try {
    await a.play();
    setState({ status: "playing" });
  } catch {
    setState({ status: "error", error: "Resume blocked" });
  }
}

export function toggleQuranAudioPause() {
  if (state.status === "playing") pauseQuranAudio();
  else if (state.status === "paused") void resumeQuranAudio();
}

export function stopQuranAudio() {
  jobId += 1;
  maxVerse = null;
  if (audio) {
    audio.pause();
    audio.onerror = null;
    audio.onstalled = null;
    audio.removeAttribute("src");
    audio.load();
  }
  resumeLiveDualAfterAudio();
  setState({
    mode: "idle",
    status: "idle",
    reciterId: null,
    reciterName: "",
    surahId: null,
    verseNum: null,
    label: "",
    error: "",
    streamUrl: "",
  });
}
