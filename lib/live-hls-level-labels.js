/**
 * Human-readable labels for Hls.js `Level` objects (from manifest RESOLUTION / bandwidth).
 * @param {{ width?: number; height?: number; bitrate?: number }} level
 * @returns {string}
 */
export function formatLiveHlsLevelLabel(level) {
  const h = Number(level?.height);
  const w = Number(level?.width);
  const br = Number(level?.bitrate);
  if (Number.isFinite(h) && h > 0) {
    return `~${h}p`;
  }
  if (Number.isFinite(w) && w > 0) {
    return `~${w}×?`;
  }
  if (Number.isFinite(br) && br > 0) {
    const kbps = Math.round(br / 1000);
    return `~${kbps} kbps`;
  }
  return "Variant";
}

/**
 * @param {*} hls — Hls.js instance with `.levels`
 * @returns {{ value: number; label: string }[]}
 */
export function buildLiveHlsQualityLevelOptions(hls) {
  const levels = hls?.levels;
  if (!Array.isArray(levels) || levels.length === 0) return [];
  return levels.map((lvl, i) => ({
    value: i,
    label: formatLiveHlsLevelLabel(lvl),
  }));
}

/**
 * Prefer the ~384px-tall rung (Globecast Makkah ladder: index 1). Falls back to highest level.
 * @param {*} hls — Hls.js instance with `.levels[]` entries `{ height?, ... }`
 * @returns {number} level index, or `-1` if no levels
 */
export function defaultLiveHlsManualLevelIndex(hls) {
  const levels = hls?.levels;
  if (!Array.isArray(levels) || levels.length === 0) return -1;
  const idx = levels.findIndex((l) => {
    const h = Number(l?.height);
    return h >= 360 && h <= 420;
  });
  if (idx !== -1) return idx;
  return levels.length - 1;
}

/**
 * @param {number} requested — `-1` = auto
 * @param {number} levelCount
 * @returns {number}
 */
export function clampLiveHlsUserLevel(requested, levelCount) {
  if (!Number.isFinite(requested) || levelCount < 1) return -1;
  if (requested === -1) return -1;
  return Math.max(0, Math.min(Math.floor(requested), levelCount - 1));
}
