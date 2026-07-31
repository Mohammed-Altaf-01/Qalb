import { liveStreamSlotForUrl, primaryLiveStreamUrl } from "@/lib/live-stream-candidates";

/**
 * @param {number | undefined} id
 * @returns {import('@/lib/live-stream-candidates').LiveStreamSlot | null}
 */
function slotForChannelId(id) {
  if (id === 3) return "makkah";
  if (id === 4) return "madinah";
  return null;
}

/**
 * @param {string | undefined} name
 * @returns {import('@/lib/live-stream-candidates').LiveStreamSlot | null}
 */
function slotForChannelName(name) {
  const n = String(name ?? "");
  if (/quran|makkah|mekka/i.test(n)) return "makkah";
  if (/madina|madinah|sunnah|sunna/i.test(n)) return "madinah";
  return null;
}

/**
 * Pin mp3quran's `/live-tv` entries to the current best origin for their slot.
 *
 * mp3quran advertises `win.holol.com` Wowza paths whose availability comes and
 * goes, and the Globecast mirror it used to be rewritten to has since dropped
 * the Makkah stream. Rather than hardcode whichever one happens to work today,
 * resolve the *slot* (Makkah vs Madinah) and hand back that slot's primary
 * candidate; `attachLiveHls` fails over to the rest of the list at runtime.
 *
 * URLs that don't belong to the pair are passed through untouched.
 *
 * @param {string} url
 * @param {{ id?: number; name?: string }} [meta]
 * @returns {string}
 */
export function normalizeLiveTvStreamUrl(url, meta = {}) {
  const raw = String(url ?? "").trim();
  if (!raw) return raw;

  const slot = liveStreamSlotForUrl(raw) ?? slotForChannelId(meta.id) ?? slotForChannelName(meta.name);
  if (!slot) return raw;

  return primaryLiveStreamUrl(slot);
}
