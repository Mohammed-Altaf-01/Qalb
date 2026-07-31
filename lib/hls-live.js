import Hls from "hls.js";

import { defaultLiveHlsManualLevelIndex } from "@/lib/live-hls-level-labels";
import { nextLiveStreamCandidate } from "@/lib/live-stream-candidates";

/**
 * @typedef {object} AttachLiveHlsOptions
 * @property {(hls: unknown) => void} [onManifestParsed]
 * @property {boolean} [capLevelToPlayerSize]
 * @property {(url: string) => void} [onSourceFallback] — called after switching to a backup origin
 */

/** Hls.js config for 24/7 Globecast live streams (stable playback over low-latency). */
export const LIVE_HLS_CONFIG = {
  enableWorker: false,
  lowLatencyMode: false,
  startLevel: -1,
  maxBufferLength: 16,
  maxMaxBufferLength: 45,
  manifestLoadingMaxRetry: 6,
  fragLoadingMaxRetry: 8,
};

const STALL_RECOVERY_DETAILS = new Set(["bufferStalledError", "bufferSeekOverHole"]);

/**
 * Fatal errors that mean "this origin is not serving this stream" rather than
 * "the network hiccuped" — the manifest itself never loaded or parsed. Retrying
 * the same URL cannot fix a 404, so these are the ones worth failing over on.
 */
const SOURCE_FAILOVER_DETAILS = new Set([
  "manifestLoadError",
  "manifestLoadTimeOut",
  "manifestParsingError",
  "manifestIncompatibleCodecsError",
  "levelLoadError",
  "levelLoadTimeOut",
  "levelEmptyError",
]);

/**
 * @param {unknown} detail
 * @returns {boolean}
 */
export function isLiveHlsSourceFailoverDetail(detail) {
  return typeof detail === "string" && SOURCE_FAILOVER_DETAILS.has(detail);
}

/**
 * @param {unknown} detail
 * @returns {boolean}
 */
export function isLiveHlsStallDetail(detail) {
  return typeof detail === "string" && STALL_RECOVERY_DETAILS.has(detail);
}

/**
 * Debounced non-fatal stall recovery — at most one `startLoad` per window per instance.
 * @param {Map<unknown, number>} registry
 * @param {unknown} hls
 * @param {number} [windowMs]
 * @returns {boolean} whether recovery was scheduled
 */
export function scheduleLiveHlsStallRecovery(registry, hls, windowMs = 2500) {
  if (!hls || typeof hls.startLoad !== "function") return false;
  const now = Date.now();
  const last = registry.get(hls) ?? 0;
  if (now - last < windowMs) return false;
  registry.set(hls, now);
  try {
    hls.startLoad(-1);
  } catch {
    return false;
  }
  return true;
}

/**
 * How far behind the live edge playback may drift before a switch re-seeks.
 *
 * A prewarmed stream that has been paused (or had its load stopped) resumes at
 * whatever `currentTime` it froze at. On a 24/7 live playlist those segments
 * roll out of the window, so it plays a few stale seconds and then stalls
 * forever. Anything past this drift gets snapped to the live edge instead.
 */
export const LIVE_EDGE_MAX_DRIFT_S = 12;

/**
 * End of the last buffered range, or `NaN` when nothing is buffered.
 * @param {HTMLVideoElement | null | undefined} video
 * @returns {number}
 */
export function mediaBufferedEnd(video) {
  const ranges = video?.buffered;
  const count = Number(ranges?.length);
  if (!Number.isFinite(count) || count < 1) return NaN;
  try {
    return Number(ranges.end(count - 1));
  } catch {
    return NaN;
  }
}

/**
 * Where playback should jump to rejoin the live edge, or `null` to stay put.
 *
 * @param {object} state
 * @param {number} state.currentTime — the media element's current position
 * @param {number} [state.liveSyncPosition] — Hls.js's live sync point (preferred)
 * @param {number} [state.bufferedEnd] — fallback when `liveSyncPosition` is unset
 * @param {number} [state.maxDriftS] — drift tolerated before seeking
 * @returns {number | null}
 */
export function liveEdgeSeekTarget(state) {
  const { currentTime, liveSyncPosition, bufferedEnd, maxDriftS = LIVE_EDGE_MAX_DRIFT_S } = state ?? {};

  const target = Number.isFinite(liveSyncPosition)
    ? Number(liveSyncPosition)
    : Number.isFinite(bufferedEnd)
      ? Number(bufferedEnd)
      : NaN;

  // Nothing buffered and no sync point yet — there is nowhere to seek to.
  if (!Number.isFinite(target) || target <= 0) return null;

  const now = Number.isFinite(currentTime) ? Number(currentTime) : 0;

  // Already at (or ahead of) the edge.
  if (target - now <= maxDriftS) return null;

  return target;
}

/**
 * Re-evaluate quality cap and manual level after the video moves to a full-size player.
 * @param {*} hls — Hls.js instance
 * @param {HTMLVideoElement} [video]
 */
export function refreshLiveHlsForDisplay(hls, video) {
  if (!hls?.levels?.length) return;
  try {
    if (typeof hls.config === "object" && hls.config) {
      hls.config.capLevelToPlayerSize = true;
    }
    const idx = defaultLiveHlsManualLevelIndex(hls);
    if (idx >= 0 && hls.currentLevel !== idx) {
      hls.currentLevel = idx;
    }
    if (video?.paused) {
      void video.play().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/**
 * Native HLS (iOS/macOS Safari) with the same candidate failover hls.js gets.
 *
 * Safari never runs hls.js, so without this a dead origin is simply a black
 * player on every iPhone — no error handler, no second attempt.
 *
 * @param {HTMLVideoElement} video
 * @param {string} url
 * @param {AttachLiveHlsOptions} [options]
 */
function attachNativeLiveSource(video, url, options = {}) {
  let activeUrl = url;

  const onError = () => {
    const next = nextLiveStreamCandidate(activeUrl);
    if (!next) {
      video.removeEventListener("error", onError);
      return;
    }
    activeUrl = next;
    try {
      video.src = next;
      video.load();
      void video.play().catch(() => {});
      options.onSourceFallback?.(next);
    } catch {
      /* ignore */
    }
  };

  video.addEventListener("error", onError);
  video.src = url;
}

/**
 * Hls.js tuned for third-party live `.m3u8` (Globecast Akamai, legacy holol, etc.).
 * Workers are off — they often fail or hang when bundled (Next/Turbopack).
 * @param {HTMLVideoElement} video
 * @param {string} url
 * @param {AttachLiveHlsOptions} [options]
 */
export function attachLiveHls(video, url, options = {}) {
  if (!url || !video) return null;

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    attachNativeLiveSource(video, url, options);
    return null;
  }

  if (Hls.isSupported()) {
    const stallRegistry = new Map();
    let activeUrl = url;
    const hls = new Hls({
      ...LIVE_HLS_CONFIG,
      capLevelToPlayerSize: Boolean(options.capLevelToPlayerSize),
      xhrSetup(xhr) {
        xhr.withCredentials = false;
      },
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    if (options.onManifestParsed) {
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        try {
          options.onManifestParsed?.(hls);
        } catch {
          /* ignore */
        }
      });
    }
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data) return;
      if (!data.fatal) {
        if (isLiveHlsStallDetail(data.details)) {
          scheduleLiveHlsStallRecovery(stallRegistry, hls);
        }
        return;
      }
      try {
        // The origin is dead for this stream — move to the next candidate
        // before falling back to blind retries against the same URL.
        if (isLiveHlsSourceFailoverDetail(data.details)) {
          const next = nextLiveStreamCandidate(activeUrl);
          if (next) {
            activeUrl = next;
            hls.loadSource(next);
            hls.startLoad(-1);
            options.onSourceFallback?.(next);
            return;
          }
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad(-1);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        }
      } catch {
        /* ignore */
      }
    });
    return hls;
  }

  video.src = url;
  return null;
}
