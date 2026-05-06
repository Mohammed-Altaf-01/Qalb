/** Persisted UI scale for Arabic + reading prose (translations, hadith EN). */

export const LS_READING_SCALE = "qalb_reading_scale";

/** @typedef {"comfortable" | "standard" | "compact"} ReadingScaleId */

/** @type {ReadingScaleId[]} */
export const READING_SCALE_IDS = ["comfortable", "standard", "compact"];

/** @type {Record<ReadingScaleId, number>} multiplier against base token sizes */
export const READING_SCALE_MULTIPLIERS = {
  comfortable: 1,
  standard: 0.92,
  compact: 0.82,
};

/**
 * @param {unknown} v
 * @returns {ReadingScaleId}
 */
export function normalizeReadingScale(v) {
  if (READING_SCALE_IDS.includes(v)) return v;
  return "comfortable";
}

/**
 * Apply scale to document root (browser only).
 * @param {ReadingScaleId} scale
 */
export function applyReadingScaleToDocument(scale) {
  if (typeof document === "undefined") return;
  const id = normalizeReadingScale(scale);
  document.documentElement.dataset.readingScale = id;
  document.documentElement.style.setProperty("--reading-font-mult", String(READING_SCALE_MULTIPLIERS[id]));
}
