/**
 * Dual HLS prewarm: Makkah + Madinah streams start muted as soon as the app boots,
 * so /live can attach with minimal switching lag. Only one stream is unmuted at a time.
 */
import Hls from "hls.js";

import {
  LIVE_STREAM_FALLBACK_MADINAH,
  LIVE_STREAM_FALLBACK_MAKKAH,
} from "@/lib/live-stream-defaults";

/** @typedef {{ id?: number; name?: string; url?: string }} LiveChannel */

let makkahVideo = null;
let madinahVideo = null;
let makkahHls = null;
let madinahHls = null;
/** Hidden host when not attached to the Live page */
let poolHost = null;
let lastMakkahUrl = "";
let lastMadinahUrl = "";
/** @type {'makkah' | 'madinah'} */
let activeSlot = "makkah";
let userMuted = false;

function ensurePoolHost() {
  if (typeof document === "undefined") return null;
  if (poolHost) return poolHost;
  poolHost = document.createElement("div");
  poolHost.id = "qalb-live-dual-pool";
  poolHost.setAttribute("aria-hidden", "true");
  poolHost.className =
    "fixed w-px h-px overflow-hidden opacity-0 pointer-events-none -z-[1] bottom-0 end-0 border-0 p-0 m-0";
  document.body.appendChild(poolHost);
  return poolHost;
}

function destroyHls(h) {
  if (!h) return;
  try {
    h.destroy();
  } catch {
    /* ignore */
  }
}

function tearDownPlayers() {
  destroyHls(makkahHls);
  destroyHls(madinahHls);
  makkahHls = null;
  madinahHls = null;
  for (const v of [makkahVideo, madinahVideo]) {
    if (!v) continue;
    try {
      v.pause();
      v.removeAttribute("src");
      v.load();
      v.remove();
    } catch {
      /* ignore */
    }
  }
  makkahVideo = null;
  madinahVideo = null;
}

function attachHlsToVideo(video, url) {
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return null;
  }
  if (Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    hls.loadSource(url);
    hls.attachMedia(video);
    return hls;
  }
  video.src = url;
  return null;
}

function createVideo() {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  video.tabIndex = -1;
  video.controls = false;
  return video;
}

function applyAudioState() {
  if (!makkahVideo || !madinahVideo) return;
  const mM = activeSlot !== "makkah" || userMuted;
  const dM = activeSlot !== "madinah" || userMuted;
  makkahVideo.muted = mM;
  madinahVideo.muted = dM;
  makkahVideo.style.zIndex = activeSlot === "makkah" ? "2" : "1";
  madinahVideo.style.zIndex = activeSlot === "madinah" ? "2" : "1";
}

/**
 * Resolve Makkah + Madinah stream URLs from API channel list (same logic as `app/live/page.js` fallbacks).
 * @param {LiveChannel[]|null|undefined} channels
 * @returns {{ makkahUrl: string; madinahUrl: string }}
 */
export function resolveMakkahMadinahUrls(channels) {
  let list = Array.isArray(channels) ? [...channels] : [];
  if (list.length === 0) {
    list = [
      { id: 3, name: "Quran channel (Makkah)", url: LIVE_STREAM_FALLBACK_MAKKAH },
      { id: 4, name: "Sunna channel (Madinah)", url: LIVE_STREAM_FALLBACK_MADINAH },
    ];
  }
  const makkahCh =
    list.find((c) => c?.url && /quran|makkah|mekka/i.test(c.name ?? "")) ?? list.find((c) => c?.url) ?? list[0];
  const madinahCh =
    list.find((c) => c?.url && /madina|madinah|sunnah|sunna/i.test(c.name ?? "")) ??
    list.find((c) => c?.url && c.url !== makkahCh?.url);
  const makkahUrl = makkahCh?.url || LIVE_STREAM_FALLBACK_MAKKAH;
  const madinahUrl = madinahCh?.url || LIVE_STREAM_FALLBACK_MADINAH;
  return { makkahUrl, madinahUrl };
}

async function fetchChannelsList() {
  const res = await fetch("/api/live/tv?language=eng");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.channels) ? data.channels : [];
}

/**
 * Start (or refresh) muted dual HLS decode for Makkah + Madinah. Idempotent for same URLs.
 * @param {LiveChannel[]|null|undefined} [channels] — omit to fetch `/api/live/tv` client-side
 */
export async function ensureLiveDualPrewarm(channels) {
  if (typeof window === "undefined") return;
  const list = channels ?? (await fetchChannelsList());
  const { makkahUrl, madinahUrl } = resolveMakkahMadinahUrls(list);
  if (!makkahUrl || !madinahUrl) return;

  if (makkahVideo && madinahVideo && makkahUrl === lastMakkahUrl && madinahUrl === lastMadinahUrl) {
    applyAudioState();
    return;
  }

  tearDownPlayers();
  lastMakkahUrl = makkahUrl;
  lastMadinahUrl = madinahUrl;

  const host = ensurePoolHost();
  if (!host) return;

  makkahVideo = createVideo();
  madinahVideo = createVideo();
  host.appendChild(makkahVideo);
  host.appendChild(madinahVideo);

  makkahHls = attachHlsToVideo(makkahVideo, makkahUrl);
  madinahHls = attachHlsToVideo(madinahVideo, madinahUrl);

  activeSlot = "makkah";
  userMuted = true;
  applyAudioState();
  void makkahVideo.play().catch(() => {});
  void madinahVideo.play().catch(() => {});
}

/** Full teardown (tests / hard reset). */
export function disposeLiveDualPrewarm() {
  tearDownPlayers();
  lastMakkahUrl = "";
  lastMadinahUrl = "";
  activeSlot = "makkah";
  userMuted = true;
  try {
    poolHost?.remove();
  } catch {
    /* ignore */
  }
  poolHost = null;
}

/**
 * @param {'makkah' | 'madinah'} slot
 */
export function setLiveDualPrewarmActive(slot) {
  activeSlot = slot === "madinah" ? "madinah" : "makkah";
  applyAudioState();
}

export function setLiveDualUserMuted(muted) {
  userMuted = Boolean(muted);
  applyAudioState();
}

/** Active element for play/pause controls (Makkah/Madinah prewarm only). */
export function getActiveLiveDualVideo() {
  if (!makkahVideo || !madinahVideo) return null;
  return activeSlot === "madinah" ? madinahVideo : makkahVideo;
}

export function getLiveDualPrewarmUrls() {
  return { makkahUrl: lastMakkahUrl, madinahUrl: lastMadinahUrl };
}

/** Map selected stream URL to Makkah vs Madinah slot (defaults to Makkah). */
export function slotForSelectedUrl(selectedUrl) {
  const { madinahUrl } = getLiveDualPrewarmUrls();
  if (selectedUrl && madinahUrl && selectedUrl === madinahUrl) return "madinah";
  return "makkah";
}

/**
 * Move both players into `container` (stacked). Returns detach: moves back to pool, mutes both for background.
 * @param {HTMLElement|null} container
 * @returns {() => void}
 */
export function attachLiveDualPrewarmToContainer(container) {
  if (!container || !makkahVideo || !madinahVideo) {
    return () => {};
  }
  ensurePoolHost();
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.minHeight = "0";
  container.style.minWidth = "0";
  const stackStyle =
    "position:absolute;left:0;top:0;right:0;bottom:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;background:#000;display:block;";
  makkahVideo.removeAttribute("class");
  madinahVideo.removeAttribute("class");
  makkahVideo.style.cssText = stackStyle;
  madinahVideo.style.cssText = stackStyle;
  makkahVideo.style.objectFit = "contain";
  madinahVideo.style.objectFit = "contain";

  container.appendChild(makkahVideo);
  container.appendChild(madinahVideo);
  applyAudioState();

  return () => {
    try {
      userMuted = true;
      applyAudioState();
      if (poolHost && makkahVideo && madinahVideo) {
        poolHost.appendChild(makkahVideo);
        poolHost.appendChild(madinahVideo);
      }
    } catch {
      /* ignore */
    }
  };
}

/** Pause both prewarm decoders (e.g. when playing a non–Makkah/Madinah legacy stream). */
export function pauseLiveDualPrewarm() {
  try {
    makkahVideo?.pause();
    madinahVideo?.pause();
  } catch {
    /* ignore */
  }
}

export function resumeLiveDualPrewarm() {
  void makkahVideo?.play().catch(() => {});
  void madinahVideo?.play().catch(() => {});
  applyAudioState();
}

/** App idle entry: warm both streams (muted). */
export function warmMakkahLiveStream() {
  void ensureLiveDualPrewarm();
}
