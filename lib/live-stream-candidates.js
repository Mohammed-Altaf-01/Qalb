/**
 * Ordered stream candidates for the Makkah / Madinah live pair.
 *
 * Both upstreams have gone dark at least once:
 *
 * - `win.holol.com` (Wowza) 404'd, so everything was rewritten to Globecast.
 * - Globecast then dropped `saudi_quran` entirely (404, while `saudi_sunnah`
 *   stayed up) — which is why only Madinah played. Meanwhile holol came back.
 *
 * So a single hardcoded URL per slot is the bug, not the URL itself. Each slot
 * lists its origins best-first; `attachLiveHls` walks to the next one when the
 * manifest fails to load, and the list is deliberately non-wrapping so a total
 * outage surfaces as an error instead of an infinite retry loop.
 */

const GLOBECAST_MAKKAH = "https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8";
const GLOBECAST_MADINAH = "https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8";
const HOLOL_MAKKAH = "https://win.holol.com/live/quran/playlist.m3u8";
const HOLOL_MADINAH = "https://win.holol.com/live/sunnah/playlist.m3u8";

/** @typedef {'makkah' | 'madinah'} LiveStreamSlot */

/** @type {Record<LiveStreamSlot, string[]>} */
export const LIVE_STREAM_CANDIDATES = {
  // Globecast `saudi_quran` is currently 404 — holol first until it returns.
  makkah: [HOLOL_MAKKAH, GLOBECAST_MAKKAH],
  // Globecast `saudi_sunnah` is live and CDN-backed; holol is the single-origin backup.
  madinah: [GLOBECAST_MADINAH, HOLOL_MADINAH],
};

/** Origins to preconnect / DNS-prefetch (every candidate host). */
export const LIVE_STREAM_ORIGINS = ["https://cdn-globecast.akamaized.net", "https://win.holol.com"];

/**
 * @param {LiveStreamSlot} slot
 * @returns {string}
 */
export function primaryLiveStreamUrl(slot) {
  return LIVE_STREAM_CANDIDATES[slot === "madinah" ? "madinah" : "makkah"][0];
}

/**
 * Which slot a stream URL belongs to, by exact match then by path shape.
 *
 * Path matching covers both packagings: Globecast uses `saudi_quran` /
 * `saudi_sunnah` stream names, holol uses `/live/quran` / `/live/sunnah`.
 *
 * @param {string | null | undefined} url
 * @returns {LiveStreamSlot | null} — `null` when the URL is not one of the pair
 */
export function liveStreamSlotForUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return null;

  for (const slot of /** @type {LiveStreamSlot[]} */ (["makkah", "madinah"])) {
    if (LIVE_STREAM_CANDIDATES[slot].includes(raw)) return slot;
  }

  let path;
  try {
    path = new URL(raw).pathname.toLowerCase();
  } catch {
    return null;
  }

  if (path.includes("saudi_quran") || path.includes("/live/quran")) return "makkah";
  if (path.includes("saudi_sunnah") || path.includes("/live/sunnah")) return "madinah";
  return null;
}

/**
 * The next candidate to try after `currentUrl` failed.
 *
 * Non-wrapping on purpose: returning to an already-failed URL would spin
 * hls.js between two dead origins forever.
 *
 * @param {string | null | undefined} currentUrl
 * @returns {string | null} — `null` when the URL is unknown or already last
 */
export function nextLiveStreamCandidate(currentUrl) {
  const slot = liveStreamSlotForUrl(currentUrl);
  if (!slot) return null;
  const list = LIVE_STREAM_CANDIDATES[slot];
  const idx = list.indexOf(String(currentUrl ?? "").trim());
  // Unknown-but-slotted URL (e.g. a future upstream rename): start at the top
  // of the list rather than giving up.
  if (idx === -1) return list[0];
  return idx + 1 < list.length ? list[idx + 1] : null;
}
