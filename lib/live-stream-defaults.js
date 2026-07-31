import { LIVE_STREAM_ORIGINS, primaryLiveStreamUrl } from "@/lib/live-stream-candidates";

/**
 * Preferred HLS for Saudi Quran / Sunnah.
 *
 * These are the *first* candidate for each slot, not the only one — see
 * `lib/live-stream-candidates.js` for the full failover list and why it exists.
 */
export const LIVE_STREAM_FALLBACK_MAKKAH = primaryLiveStreamUrl("makkah");
export const LIVE_STREAM_FALLBACK_MADINAH = primaryLiveStreamUrl("madinah");

/** CDN origin for preconnect / DNS hints (first candidate host). */
export const LIVE_STREAM_CDN_ORIGIN = LIVE_STREAM_ORIGINS[0];

export { LIVE_STREAM_ORIGINS };
