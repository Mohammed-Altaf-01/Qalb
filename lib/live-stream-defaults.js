/**
 * Working HLS for Saudi Quran / Sunnah (Globecast on Akamai).
 * mp3quran still advertises `win.holol.com/...` which now 404s — see `normalizeLiveTvStreamUrl`.
 */
export const LIVE_STREAM_FALLBACK_MAKKAH =
  "https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8";
export const LIVE_STREAM_FALLBACK_MADINAH =
  "https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8";

/** CDN origin for preconnect / DNS hints */
export const LIVE_STREAM_CDN_ORIGIN = "https://cdn-globecast.akamaized.net";
