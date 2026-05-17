import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

const GLOBECAST_HOST = "cdn-globecast.akamaized.net";

/**
 * @param {string} host
 * @returns {boolean}
 */
function isGlobecastHost(host) {
  return host === GLOBECAST_HOST || host.endsWith(`.${GLOBECAST_HOST}`);
}

/**
 * @param {number | undefined} id
 * @returns {string | null}
 */
function fallbackForChannelId(id) {
  if (id === 3) return LIVE_STREAM_FALLBACK_MAKKAH;
  if (id === 4) return LIVE_STREAM_FALLBACK_MADINAH;
  return null;
}

/**
 * @param {string} name
 * @returns {string | null}
 */
function fallbackForChannelName(name) {
  const n = String(name ?? "");
  if (/quran|makkah|mekka/i.test(n)) return LIVE_STREAM_FALLBACK_MAKKAH;
  if (/madina|madinah|sunnah|sunna/i.test(n)) return LIVE_STREAM_FALLBACK_MADINAH;
  return null;
}

/**
 * mp3quran `/live-tv` still lists `win.holol.com` Wowza paths that now return 404.
 * Map those (and obvious path variants) to working Saudi Quran / Sunnah HLS on Akamai.
 *
 * @param {string} url
 * @param {{ id?: number; name?: string }} [meta]
 * @returns {string}
 */
export function normalizeLiveTvStreamUrl(url, meta = {}) {
  const raw = String(url ?? "").trim();
  if (!raw) return raw;

  const byId = fallbackForChannelId(meta.id);
  if (byId) {
    try {
      const parsed = new URL(raw);
      if (!isGlobecastHost(parsed.hostname.toLowerCase())) return byId;
    } catch {
      return byId;
    }
  }

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
    const byName = fallbackForChannelName(meta.name);
    if (byName) return byName;
    return LIVE_STREAM_FALLBACK_MAKKAH;
  }

  if (!isGlobecastHost(host)) {
    const byName = fallbackForChannelName(meta.name);
    if (byName) return byName;
  }

  return raw;
}
