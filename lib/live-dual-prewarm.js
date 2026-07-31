/**
 * Dual HLS prewarm: Makkah + Madinah streams start muted as soon as the app boots,
 * so /live can attach with minimal switching lag. Only one stream is unmuted at a time.
 */
import { attachLiveHls, liveEdgeSeekTarget, mediaBufferedEnd, refreshLiveHlsForDisplay } from "@/lib/hls-live";
import { buildLiveHlsQualityLevelOptions, clampLiveHlsUserLevel } from "@/lib/live-hls-level-labels";
import { liveStreamSlotForUrl } from "@/lib/live-stream-candidates";
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
/**
 * Whether each slot's loader is currently running.
 *
 * Tracked here because `startLoad(-1)` is not idempotent — it restarts the
 * loading pipeline. `applyAudioState()` runs on every mute toggle, slot change,
 * attach and resume, so calling it unconditionally was resetting both streams'
 * buffers several times during a single page mount.
 */
let makkahLoading = false;
let madinahLoading = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let liveEdgeSeekTimer = null;
let liveEdgeSeekAttempts = 0;

/** Attempts (and spacing) allowed for the post-switch live-edge seek. */
const LIVE_EDGE_SEEK_MAX_ATTEMPTS = 8;
const LIVE_EDGE_SEEK_INTERVAL_MS = 220;

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
  clearLiveEdgeSeek();
  destroyHls(makkahHls);
  destroyHls(madinahHls);
  makkahHls = null;
  madinahHls = null;
  makkahLoading = false;
  madinahLoading = false;
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
 * Only the active slot loads segments.
 *
 * Both slots used to load continuously. Two 24/7 HLS streams pulling segments
 * at once split the available bandwidth, and — because `LIVE_HLS_CONFIG` runs
 * with `enableWorker: false` — they also demux and remux on the same main
 * thread. On a fast desktop connection you get away with it; on the kind of
 * link most users are on, the two starve each other and only whichever stream
 * started first ever plays smoothly.
 *
 * The prewarm value is preserved regardless: both Hls instances stay alive with
 * their manifests parsed, levels known and MSE attached, so activating a slot
 * is a segment fetch rather than a cold start.
 *
 * @param {'makkah' | 'madinah'} slot — the active slot
 * @returns {{ makkah: 'load' | 'stop'; madinah: 'load' | 'stop' }}
 */
export function getLiveDualLoadPolicy(slot) {
  const active = slot === "madinah" ? "madinah" : "makkah";
  return {
    makkah: active === "makkah" ? "load" : "stop",
    madinah: active === "madinah" ? "load" : "stop",
  };
}

/**
 * Start or stop one slot's loader, skipping no-op transitions.
 * @param {'makkah' | 'madinah'} slot
 * @param {boolean} shouldLoad
 */
function setSlotLoading(slot, shouldLoad) {
  const hls = slot === "madinah" ? madinahHls : makkahHls;
  if (!hls) return;

  const isLoading = slot === "madinah" ? madinahLoading : makkahLoading;
  if (isLoading === shouldLoad) return;

  try {
    if (shouldLoad) hls.startLoad(-1);
    else hls.stopLoad();
  } catch {
    return;
  }

  if (slot === "madinah") madinahLoading = shouldLoad;
  else makkahLoading = shouldLoad;
}

function applyLoadPolicy() {
  const policy = getLiveDualLoadPolicy(activeSlot);
  setSlotLoading("makkah", policy.makkah === "load");
  setSlotLoading("madinah", policy.madinah === "load");
}

function clearLiveEdgeSeek() {
  if (liveEdgeSeekTimer != null) {
    clearTimeout(liveEdgeSeekTimer);
    liveEdgeSeekTimer = null;
  }
  liveEdgeSeekAttempts = 0;
}

/**
 * Snap the newly-activated slot to the live edge.
 *
 * A slot that was stopped resumes at the `currentTime` it froze at, which on a
 * rolling live playlist is already outside the window. Without this the stream
 * plays a few stale seconds, stalls, and sits behind "Connecting to …" while
 * the nudge timer fights it.
 *
 * Retries briefly because right after `startLoad` there is nothing buffered
 * and no live sync position to seek to yet.
 */
function scheduleLiveEdgeSeek() {
  clearLiveEdgeSeek();

  const run = () => {
    liveEdgeSeekTimer = null;
    const video = getActiveLiveDualVideo();
    const hls = activeSlot === "madinah" ? madinahHls : makkahHls;
    if (!video) return;

    const target = liveEdgeSeekTarget({
      currentTime: video.currentTime,
      liveSyncPosition: hls?.liveSyncPosition,
      bufferedEnd: mediaBufferedEnd(video),
    });

    if (target != null) {
      try {
        video.currentTime = target;
      } catch {
        /* ignore */
      }
      if (video.paused) void video.play().catch(() => {});
      clearLiveEdgeSeek();
      return;
    }

    // Nothing to seek to yet (or already at the edge) — retry while buffering.
    liveEdgeSeekAttempts += 1;
    if (liveEdgeSeekAttempts < LIVE_EDGE_SEEK_MAX_ATTEMPTS) {
      liveEdgeSeekTimer = setTimeout(run, LIVE_EDGE_SEEK_INTERVAL_MS);
    } else {
      clearLiveEdgeSeek();
    }
  };

  liveEdgeSeekTimer = setTimeout(run, LIVE_EDGE_SEEK_INTERVAL_MS);
}

/**
 * Apply the load policy, pause the inactive decoder, play the active one.
 */
function syncInactiveHlsLoad() {
  applyLoadPolicy();
  if (activeSlot === "makkah") {
    madinahVideo?.pause();
  } else {
    makkahVideo?.pause();
  }
  playActiveSlotForAutoplay();
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
  // Active slot only: assigning `currentLevel` makes Hls.js start loading, so
  // applying it to the stopped slot would quietly undo the load policy and put
  // both streams back on the wire. The inactive slot picks its level up from
  // `refreshLiveHlsForDisplay` when it becomes active.
  const hls = activeSlot === "madinah" ? madinahHls : makkahHls;
  if (!hls?.levels?.length) return;
  try {
    hls.currentLevel = clampLiveHlsUserLevel(level, hls.levels.length);
  } catch {
    /* ignore */
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
    /**
     * Off while the players live in the 1px × 1px pool host — capping quality
     * to the player size there pins both streams to the lowest rung of the
     * ladder, and only the active slot ever got un-pinned (via
     * `refreshLiveHlsForDisplay`, and only 400ms after being displayed).
     * `refreshLiveHlsForDisplay` turns the cap back on once a video is
     * actually shown at full size.
     */
    capLevelToPlayerSize: false,
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
  madinahLoading = false;
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

  // `Hls.loadSource()` starts its own loader, so both begin as loading; the
  // policy applied via `applyAudioState()` below stops the inactive one.
  makkahHls = attachHlsToVideo(makkahVideo, makkahUrl, () => notifyLevelListeners());
  madinahHls = attachHlsToVideo(madinahVideo, madinahUrl, () => notifyLevelListeners());
  makkahLoading = Boolean(makkahHls);
  madinahLoading = Boolean(madinahHls);

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
  clearLiveEdgeSeek();
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
  const next = slot === "madinah" ? "madinah" : "makkah";
  const changed = next !== activeSlot;
  activeSlot = next;
  if (activeSlot === "madinah") {
    ensureMadinahHlsAttached();
  }
  applyAudioState();
  scheduleRefreshActiveForDisplay();
  // The slot we just switched to resumed from a stale position — rejoin live.
  if (changed) scheduleLiveEdgeSeek();
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
  return liveStreamSlotForUrl(selectedUrl) ?? "makkah";
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
  return liveStreamSlotForUrl(url) != null;
}

/** Recover active stream after stall (HLS startLoad + rejoin live edge + play). */
export function nudgeActiveLiveDualStream() {
  const hls = activeSlot === "madinah" ? madinahHls : makkahHls;
  const video = getActiveLiveDualVideo();
  if (hls) {
    try {
      hls.startLoad(-1);
      if (activeSlot === "madinah") madinahLoading = true;
      else makkahLoading = true;
    } catch {
      /* ignore */
    }
  }
  // A stall on a live playlist usually means the buffer fell out of the window;
  // restarting the loader alone leaves playback parked at the stale position.
  scheduleLiveEdgeSeek();
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
  clearLiveEdgeSeek();
  try {
    makkahVideo?.pause();
    madinahVideo?.pause();
    forEachHls((h) => h.stopLoad());
  } catch {
    /* ignore */
  }
  makkahLoading = false;
  madinahLoading = false;
}

export function resumeLiveDualPrewarm() {
  applyAudioState();
  syncInactiveHlsLoad();
  scheduleRefreshActiveForDisplay();
  // Resuming after a legacy stream took over — the buffer is stale by now.
  scheduleLiveEdgeSeek();
}

/** App idle entry: warm both streams (muted). */
export function warmMakkahLiveStream() {
  void ensureLiveDualPrewarm();
}
