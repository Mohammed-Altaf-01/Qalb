import Hls from "hls.js";

import { defaultLiveHlsManualLevelIndex } from "@/lib/live-hls-level-labels";

/** @typedef {{ onManifestParsed?: (hls: unknown) => void; capLevelToPlayerSize?: boolean }} AttachLiveHlsOptions */

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
 * Hls.js tuned for third-party live `.m3u8` (Globecast Akamai, legacy holol, etc.).
 * Workers are off — they often fail or hang when bundled (Next/Turbopack).
 * @param {HTMLVideoElement} video
 * @param {string} url
 * @param {AttachLiveHlsOptions} [options]
 */
export function attachLiveHls(video, url, options = {}) {
  if (!url || !video) return null;

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return null;
  }

  if (Hls.isSupported()) {
    const stallRegistry = new Map();
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
