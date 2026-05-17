/** Debounce before showing stall overlay after `waiting` / `stalled`. */
export const LIVE_OVERLAY_STALL_SHOW_MS = 400;

/** Only nudge HLS after a sustained stall. */
export const LIVE_OVERLAY_STALL_NUDGE_MS = 4000;

/** No `currentTime` advance for this long → treat as stalled. */
export const LIVE_OVERLAY_TIME_ADVANCE_MS = 800;

/**
 * Whether the live player should show the connecting/buffering overlay.
 * @param {{ hasRenderedFrame: boolean; stallMs: number; isPlaying: boolean; isPaused: boolean }} input
 * @returns {boolean}
 */
export function shouldShowLiveConnectingOverlay({ hasRenderedFrame, stallMs, isPlaying, isPaused }) {
  if (!isPlaying || isPaused) return false;
  if (!hasRenderedFrame) return true;
  return stallMs >= LIVE_OVERLAY_STALL_SHOW_MS;
}

/**
 * @param {number} lastTime
 * @param {number} currentTime
 * @param {number} [threshold]
 * @returns {boolean}
 */
export function hasLiveTimeAdvanced(lastTime, currentTime, threshold = 0.05) {
  return Number.isFinite(currentTime) && currentTime > lastTime + threshold;
}
