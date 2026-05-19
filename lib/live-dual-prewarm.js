/**
 * Dual HLS prewarm: Makkah + Madinah streams start muted as soon as the app boots,
 * so /live can attach with minimal switching lag. Only one stream is unmuted at a time.
 */
import { attachLiveHls, refreshLiveHlsForDisplay } from "@/lib/hls-live";
import { buildLiveHlsQualityLevelOptions, clampLiveHlsUserLevel } from "@/lib/live-hls-level-labels";
import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

/** @typedef {{ id?: number; name?: string; url?: string }} LiveChannel */

/** @typedef {{ value: number; label: string }} LiveQualityOption */
/** @typedef {{ native: boolean; levels: LiveQualityOption[] }} LiveQualityPayload */

let makkahVideo = null;
let madinahVideo = null;
let makkahHls = null;
let madinahHls = null;
/** @type {'cover' | 'contain'} */
let videoObjectFit = "cover";

/** @type {Set<(p: LiveQualityPayload) => void>} */
const levelListeners = new Set();
/** Hidden host when not attached to the Live page */
let poolHost = null;
let lastMakkahUrl = "";
let lastMadinahUrl = "";
/** @type {'makkah' | 'madinah'} */
let activeSlot = "makkah";
let userMuted = false;
/** @type {ResizeObserver | null} */
let attachResizeObserver = null;
/** @type {HTMLElement | null} */
let attachedContainer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let resizeRefreshTimer = null;

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
  disconnectAttachResizeObserver();
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

function pickHlsWithLevels() {
  if (makkahHls?.levels?.length) return makkahHls;
  if (madinahHls?.levels?.length) return madinahHls;
  return null;
}

function buildQualityPayload() {
  const primary = pickHlsWithLevels();
  if (primary) {
    const rows = buildLiveHlsQualityLevelOptions(primary);
    return {
      native: false,
      levels: [{ value: -1, label: "Auto" }, ...rows.map((r) => ({ value: r.value, label: r.label }))],
    };
  }
  if (makkahVideo?.src && !makkahHls) {
    return { native: true, levels: [{ value: -1, label: "Auto (device)" }] };
  }
  return { native: false, levels: [] };
}

function notifyLevelListeners() {
  const payload = buildQualityPayload();
  for (const fn of levelListeners) {
    try {
      fn(payload);
    } catch {
      /* ignore */
    }
  }
}

function refreshActiveForDisplay() {
  if (activeSlot === "madinah" && madinahHls && madinahVideo) {
    refreshLiveHlsForDisplay(madinahHls, madinahVideo);
    return;
  }
  if (makkahHls && makkahVideo) {
    refreshLiveHlsForDisplay(makkahHls, makkahVideo);
  }
}

function disconnectAttachResizeObserver() {
  if (resizeRefreshTimer != null) {
    clearTimeout(resizeRefreshTimer);
    resizeRefreshTimer = null;
  }
  try {
    attachResizeObserver?.disconnect();
  } catch {
    /* ignore */
  }
  attachResizeObserver = null;
  attachedContainer = null;
}

function scheduleRefreshActiveForDisplay() {
  if (resizeRefreshTimer != null) clearTimeout(resizeRefreshTimer);
  resizeRefreshTimer = setTimeout(() => {
    resizeRefreshTimer = null;
    refreshActiveForDisplay();
  }, 400);
}

function connectAttachResizeObserver(container) {
  disconnectAttachResizeObserver();
  if (!container || typeof ResizeObserver === "undefined") return;
  attachedContainer = container;
  attachResizeObserver = new ResizeObserver(() => {
    if (attachedContainer !== container) return;
    scheduleRefreshActiveForDisplay();
  });
  attachResizeObserver.observe(container);
}

/** Start active slot playback; muted-first when sound is requested (autoplay policy). */
function playActiveSlotForAutoplay() {
  if (!makkahVideo || !madinahVideo) return;
  const video = activeSlot === "madinah" ? madinahVideo : makkahVideo;
  const wantSound = !userMuted;
  if (wantSound) {
    video.muted = true;
    void video
      .play()
      .then(() => {
        video.muted = false;
      })
      .catch(() => {});
  } else {
    void video.play().catch(() => {});
  }
}

/**
 * Both slots buffer segments; only the active slot decodes/plays.
 */
function syncInactiveHlsLoad() {
  forEachHls((h) => {
    try {
      h.startLoad(-1);
    } catch {
      /* ignore */
    }
  });
  if (activeSlot === "makkah") {
    madinahVideo?.pause();
  } else {
    makkahVideo?.pause();
  }
  playActiveSlotForAutoplay();
}

/**
 * @param {'makkah' | 'madinah'} slot
 * @returns {{ makkah: 'load' | 'stop'; madinah: 'load' | 'stop' }}
 */
export function getLiveDualLoadPolicy(slot) {
  void slot;
  return { makkah: "load", madinah: "load" };
}

function forEachHls(fn) {
  for (const h of [makkahHls, madinahHls]) {
    if (h) {
      try {
        fn(h);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @returns {LiveQualityPayload}
 */
export function getLiveDualHlsQualityPayload() {
  return buildQualityPayload();
}

/**
 * @param {(p: LiveQualityPayload) => void} listener
 * @returns {() => void}
 */
export function subscribeLiveDualHlsQuality(listener) {
  levelListeners.add(listener);
  try {
    listener(buildQualityPayload());
  } catch {
    /* ignore */
  }
  return () => levelListeners.delete(listener);
}

/**
 * @param {number} index — `-1` auto, else `0 … levels.length - 1`
 */
export function setLiveDualHlsLevelIndex(index) {
  const level = Number(index);
  for (const h of [makkahHls, madinahHls]) {
    if (!h?.levels?.length) continue;
    try {
      h.currentLevel = clampLiveHlsUserLevel(level, h.levels.length);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {'cover' | 'contain'} fit
 */
export function setLiveDualVideoObjectFit(fit) {
  videoObjectFit = fit === "contain" ? "contain" : "cover";
  for (const v of [makkahVideo, madinahVideo]) {
    if (!v) continue;
    try {
      v.style.objectFit = videoObjectFit;
    } catch {
      /* ignore */
    }
  }
}

function attachHlsToVideo(video, url, onReady) {
  return attachLiveHls(video, url, {
    capLevelToPlayerSize: true,
    onManifestParsed: (hls) => {
      onReady?.(hls);
      notifyLevelListeners();
    },
  });
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
  syncInactiveHlsLoad();
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

function ensureMadinahHlsAttached() {
  if (!madinahVideo || madinahHls || !lastMadinahUrl) return;
  madinahHls = attachHlsToVideo(madinahVideo, lastMadinahUrl, () => {
    notifyLevelListeners();
    syncInactiveHlsLoad();
  });
  syncInactiveHlsLoad();
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
    syncInactiveHlsLoad();
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

  makkahHls = attachHlsToVideo(makkahVideo, makkahUrl, () => notifyLevelListeners());
  madinahHls = attachHlsToVideo(madinahVideo, madinahUrl, () => notifyLevelListeners());

  if (!makkahHls && makkahVideo) {
    makkahVideo.addEventListener("loadedmetadata", () => notifyLevelListeners(), { once: true });
  }

  activeSlot = "makkah";
  userMuted = true;
  applyAudioState();
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
  if (activeSlot === "madinah") {
    ensureMadinahHlsAttached();
  }
  applyAudioState();
  scheduleRefreshActiveForDisplay();
}

export function setLiveDualUserMuted(muted) {
  userMuted = Boolean(muted);
  applyAudioState();
}

/** @returns {boolean} */
export function getLiveDualUserMuted() {
  return userMuted;
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
  if (!selectedUrl) return "makkah";
  const { makkahUrl, madinahUrl } = getLiveDualPrewarmUrls();
  if (madinahUrl && selectedUrl === madinahUrl) return "madinah";
  if (makkahUrl && selectedUrl === makkahUrl) return "makkah";
  try {
    const path = new URL(selectedUrl).pathname.toLowerCase();
    if (path.includes("saudi_sunnah") || path.includes("/live/sunnah")) return "madinah";
    if (path.includes("saudi_quran") || path.includes("/live/quran")) return "makkah";
  } catch {
    /* ignore */
  }
  return "makkah";
}

/**
 * Whether the URL is one of the Makkah/Madinah Globecast pair (for dual prewarm UI).
 * @param {string | null | undefined} url
 * @param {LiveChannel[]|null|undefined} [channels]
 */
export function isMakkahMadinahStreamUrl(url, channels) {
  if (!url) return false;
  const { makkahUrl, madinahUrl } = resolveMakkahMadinahUrls(channels);
  if (url === makkahUrl || url === madinahUrl) return true;
  const pool = getLiveDualPrewarmUrls();
  if (url === pool.makkahUrl || url === pool.madinahUrl) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.includes("saudi_quran") || path.includes("saudi_sunnah");
  } catch {
    return false;
  }
}

/** Recover active stream after stall (HLS startLoad + play). */
export function nudgeActiveLiveDualStream() {
  const hls = activeSlot === "madinah" ? madinahHls : makkahHls;
  const video = getActiveLiveDualVideo();
  if (hls) {
    try {
      hls.startLoad(-1);
    } catch {
      /* ignore */
    }
  }
  if (video) void video.play().catch(() => {});
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
  const fit = videoObjectFit;
  const stackStyle = `position:absolute;left:0;top:0;right:0;bottom:0;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:${fit};object-position:center;background:#000;display:block;`;
  makkahVideo.removeAttribute("class");
  madinahVideo.removeAttribute("class");
  makkahVideo.style.cssText = stackStyle;
  madinahVideo.style.cssText = stackStyle;
  makkahVideo.style.objectFit = fit;
  madinahVideo.style.objectFit = fit;

  container.appendChild(makkahVideo);
  container.appendChild(madinahVideo);
  applyAudioState();
  syncInactiveHlsLoad();
  scheduleRefreshActiveForDisplay();
  connectAttachResizeObserver(container);

  return () => {
    try {
      disconnectAttachResizeObserver();
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
    forEachHls((h) => h.stopLoad());
  } catch {
    /* ignore */
  }
}

export function resumeLiveDualPrewarm() {
  applyAudioState();
  syncInactiveHlsLoad();
  scheduleRefreshActiveForDisplay();
}

/** App idle entry: warm both streams (muted). */
export function warmMakkahLiveStream() {
  void ensureLiveDualPrewarm();
}
