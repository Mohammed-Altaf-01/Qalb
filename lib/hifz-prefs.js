/** Last-used Hifz selector options (browser localStorage). */

export const LS_HIFZ_PREFS_V1 = "qalb_hifz_prefs_v1";

/** @typedef {'surah' | 'surahRange' | 'page' | 'ayahRange'} HifzSelectionMode */

/**
 * @typedef {object} HifzPrefs
 * @property {HifzSelectionMode} mode
 * @property {number} surahId
 * @property {number} fromSurahId
 * @property {number} toSurahId
 * @property {number} mushafPage
 * @property {number} startAyah
 * @property {number} endAyah
 * @property {number} reciterId
 */

export const DEFAULT_HIFZ_PREFS = {
  mode: "surah",
  surahId: 1,
  fromSurahId: 1,
  toSurahId: 1,
  mushafPage: 1,
  startAyah: 1,
  endAyah: 7,
  reciterId: 7,
};

/**
 * @returns {HifzPrefs}
 */
export function normalizeHifzPrefs(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HIFZ_PREFS };
  const mode = ["surah", "surahRange", "page", "ayahRange"].includes(raw.mode) ? raw.mode : "surah";
  return {
    mode,
    surahId: clampInt(raw.surahId, 1, 114, 1),
    fromSurahId: clampInt(raw.fromSurahId, 1, 114, 1),
    toSurahId: clampInt(raw.toSurahId, 1, 114, 1),
    mushafPage: clampInt(raw.mushafPage, 1, 604, 1),
    startAyah: clampInt(raw.startAyah, 1, 286, 1),
    endAyah: clampInt(raw.endAyah, 1, 286, 7),
    reciterId: clampInt(raw.reciterId, 1, 999, 7),
  };
}

/**
 * @returns {HifzPrefs}
 */
export function loadHifzPrefs() {
  if (typeof window === "undefined") return { ...DEFAULT_HIFZ_PREFS };
  try {
    const raw = JSON.parse(localStorage.getItem(LS_HIFZ_PREFS_V1) ?? "null");
    return normalizeHifzPrefs(raw);
  } catch {
    return { ...DEFAULT_HIFZ_PREFS };
  }
}

/** @param {HifzPrefs} prefs */
export function saveHifzPrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_HIFZ_PREFS_V1, JSON.stringify(normalizeHifzPrefs(prefs)));
    void import("@/lib/user-app-sync-bridge").then((m) => m.schedulePushPreferences());
  } catch {
    /* quota */
  }
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
