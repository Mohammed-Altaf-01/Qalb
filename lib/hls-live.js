import Hls from "hls.js";

/**
 * @typedef {{ onManifestParsed?: (hls: unknown) => void; capLevelToPlayerSize?: boolean }} AttachLiveHlsOptions
 */

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
    const hls = new Hls({
      enableWorker: false,
      lowLatencyMode: true,
      maxBufferLength: 45,
      maxMaxBufferLength: 90,
      manifestLoadingMaxRetry: 6,
      fragLoadingMaxRetry: 8,
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
      if (!data?.fatal) return;
      try {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
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
