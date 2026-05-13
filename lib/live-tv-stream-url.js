import {
  LIVE_STREAM_FALLBACK_MADINAH,
  LIVE_STREAM_FALLBACK_MAKKAH,
} from "@/lib/live-stream-defaults";

/**
 * mp3quran `/live-tv` still lists `win.holol.com` Wowza paths that now return 404.
 * Map those (and obvious path variants) to working Saudi Quran / Sunnah HLS on Akamai.
 *
 * @param {string} url
 * @returns {string}
 */
export function normalizeLiveTvStreamUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (host === "win.holol.com" || host.endsWith(".holol.com")) {
    if (path.includes("/live/quran")) return LIVE_STREAM_FALLBACK_MAKKAH;
    if (path.includes("/live/sunnah")) return LIVE_STREAM_FALLBACK_MADINAH;
  }
  return raw;
}
