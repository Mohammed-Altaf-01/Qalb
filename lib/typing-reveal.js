/**
 * Timing for the verse-detail translation reveal.
 *
 * The original implementation ran `setInterval(…, 20)` revealing 2 characters
 * per tick — a fixed *speed*, so the duration scaled with the length of the
 * translation. Ayat al-Kursi (~600 characters) took six seconds to become
 * readable, and cost ~300 React renders to get there.
 *
 * Here the duration is capped instead: short translations keep the original
 * 10ms-per-character cadence, long ones compress to fit the budget. The user
 * always gets the effect, and always gets to read within ~600ms.
 */

/** UI motion budget for the reveal, however long the text is. */
export const TYPING_REVEAL_MAX_MS = 600;

/** Floor, so a three-word translation still reads as a reveal and not a flash. */
export const TYPING_REVEAL_MIN_MS = 180;

/** Original cadence: 2 characters per 20ms tick. */
export const TYPING_REVEAL_MS_PER_CHAR = 10;

/**
 * How long the reveal should run for a given translation.
 *
 * @param {number} length — character count of the text being revealed
 * @param {{ maxMs?: number; minMs?: number; msPerChar?: number }} [options]
 * @returns {number} duration in ms (0 for empty text)
 */
export function typingRevealDurationMs(length, options = {}) {
  const { maxMs = TYPING_REVEAL_MAX_MS, minMs = TYPING_REVEAL_MIN_MS, msPerChar = TYPING_REVEAL_MS_PER_CHAR } = options;

  const chars = Number(length);
  if (!Number.isFinite(chars) || chars <= 0) return 0;

  const natural = chars * msPerChar;
  return Math.round(Math.min(maxMs, Math.max(minMs, natural)));
}

/**
 * Characters visible at a point in the reveal. Linear — a constant typing
 * speed is what makes it read as typing rather than as a wipe.
 *
 * @param {number} elapsedMs — ms since the reveal started
 * @param {number} totalLength — full character count
 * @param {number} durationMs — from `typingRevealDurationMs`
 * @returns {number} character count, clamped to `0 … totalLength`
 */
export function charsRevealedAt(elapsedMs, totalLength, durationMs) {
  const total = Number(totalLength);
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return total;

  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  if (elapsed >= durationMs) return total;

  return Math.min(total, Math.max(0, Math.round((elapsed / durationMs) * total)));
}

/**
 * Whether the reveal should be skipped entirely and the text shown at once.
 * Reduced motion turns a progressive reveal into a plain render — the content
 * is the point, the typing was only ever decoration.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
