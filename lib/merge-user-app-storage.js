/**
 * Pure merge helpers: server payload + current localStorage-backed lists.
 * Remote order wins; local-only rows are appended (deduped by href).
 */

/** @typedef {{ href: string }} HrefKeyed */

export function mergeRecentByHref(remoteList, localList, maxItems) {
  const remote = Array.isArray(remoteList) ? remoteList : [];
  const local = Array.isArray(localList) ? localList : [];
  const seen = new Set();
  const out = [];
  for (const item of [...remote, ...local]) {
    const href = item?.href;
    if (typeof href !== "string" || !href || seen.has(href)) continue;
    seen.add(href);
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * @param {object | null} remote
 * @param {object | null} localObj — current qalb_reading_progress shape
 */
export function mergeReadingProgress(remote, localObj) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : null;
  const l = localObj && typeof localObj === "object" ? localObj : null;
  const rTs = typeof r?.updatedAt === "number" ? r.updatedAt : 0;
  const lTs = typeof l?.updatedAt === "number" ? l.updatedAt : 0;
  if (r && r.surahId != null && rTs >= lTs) {
    return {
      surahId: Number(r.surahId),
      verseNum: r.verseNum != null ? Number(r.verseNum) : 1,
      translationId: r.translationId != null ? Number(r.translationId) : 20,
      updatedAt: rTs || Date.now(),
    };
  }
  if (l && l.surahId != null) {
    return {
      surahId: Number(l.surahId),
      verseNum: l.verseNum != null ? Number(l.verseNum) : 1,
      translationId: l.translationId != null ? Number(l.translationId) : 20,
      updatedAt: lTs || Date.now(),
    };
  }
  return null;
}

/**
 * @param {object | null} remote
 * @param {string} localTheme — 'light' | 'dark' from qalb_theme
 */
export function mergePreferencesPayload(remote, localTheme, localScale, localReciter, localScript, localTajweed) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const theme =
    r.theme === "light" || r.theme === "dark"
      ? r.theme
      : localTheme === "light" || localTheme === "dark"
        ? localTheme
        : "dark";
  const readingScale = typeof r.readingScale === "string" ? r.readingScale : localScale;
  const reciterId =
    typeof r.reciterId === "number" && Number.isFinite(r.reciterId)
      ? r.reciterId
      : typeof localReciter === "number"
        ? localReciter
        : 7;
  const quranScript = r.quranScript === "indopak" ? "indopak" : localScript === "indopak" ? "indopak" : "uthmani";
  const tajweedEnabled =
    typeof r.tajweedEnabled === "boolean" ? r.tajweedEnabled : typeof localTajweed === "boolean" ? localTajweed : false;
  return {
    theme,
    readingScale: readingScale || "comfortable",
    reciterId,
    quranScript,
    tajweedEnabled,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}
