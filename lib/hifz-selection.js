/**
 * Expand Hifz selection specs into verse keys (surah:ayah).
 */

/** @typedef {'surah' | 'surahRange' | 'page' | 'ayahRange'} HifzSelectionMode */

/**
 * @typedef {object} HifzSelectionSpec
 * @property {HifzSelectionMode} mode
 * @property {number} [surahId]
 * @property {number} [fromSurahId]
 * @property {number} [toSurahId]
 * @property {number} [mushafPage]
 * @property {number} [startAyah]
 * @property {number} [endAyah]
 */

/**
 * @typedef {object} ChapterLike
 * @property {number} id
 * @property {number} verses_count
 */

/**
 * @param {ChapterLike[]} chapters
 * @param {number} surahId
 * @returns {number}
 */
export function versesCountForSurah(chapters, surahId) {
  const ch = chapters.find((c) => c.id === surahId);
  const n = ch?.verses_count;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {number} surahId
 * @param {number} ayah
 * @returns {string}
 */
export function verseKey(surahId, ayah) {
  return `${surahId}:${ayah}`;
}

/**
 * @param {HifzSelectionSpec} spec
 * @param {ChapterLike[]} chapters
 * @returns {{ keys: string[], error?: string }}
 */
export function expandSelectionToVerseKeysSync(spec, chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return { keys: [], error: "Chapter list unavailable." };
  }

  const mode = spec?.mode;
  if (mode === "surah") {
    const sid = parseInt(spec.surahId, 10);
    if (!Number.isFinite(sid) || sid < 1 || sid > 114) {
      return { keys: [], error: "Invalid surah." };
    }
    return { keys: keysForSurah(chapters, sid) };
  }

  if (mode === "surahRange") {
    let from = parseInt(spec.fromSurahId, 10);
    let to = parseInt(spec.toSurahId, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return { keys: [], error: "Invalid surah range." };
    }
    if (from > to) [from, to] = [to, from];
    from = Math.max(1, Math.min(114, from));
    to = Math.max(1, Math.min(114, to));
    const keys = [];
    for (let s = from; s <= to; s += 1) {
      keys.push(...keysForSurah(chapters, s));
    }
    return keys.length ? { keys } : { keys: [], error: "No verses in range." };
  }

  if (mode === "ayahRange") {
    const sid = parseInt(spec.surahId, 10);
    if (!Number.isFinite(sid) || sid < 1 || sid > 114) {
      return { keys: [], error: "Invalid surah." };
    }
    const max = versesCountForSurah(chapters, sid);
    if (!max) return { keys: [], error: "Unknown surah length." };
    let start = parseInt(spec.startAyah, 10);
    let end = parseInt(spec.endAyah, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { keys: [], error: "Invalid ayah range." };
    }
    if (start > end) [start, end] = [end, start];
    start = Math.max(1, Math.min(max, start));
    end = Math.max(1, Math.min(max, end));
    const keys = [];
    for (let a = start; a <= end; a += 1) keys.push(verseKey(sid, a));
    return keys.length ? { keys } : { keys: [], error: "Empty ayah range." };
  }

  if (mode === "page") {
    return { keys: [], error: "Page mode requires async expansion." };
  }

  return { keys: [], error: "Unknown selection mode." };
}

/**
 * @param {Array<{ verse_key?: string }>} verses
 * @returns {string[]}
 */
export function verseKeysFromPageVerses(verses) {
  const seen = new Set();
  const keys = [];
  for (const v of verses ?? []) {
    const k = typeof v?.verse_key === "string" ? v.verse_key.trim() : "";
    if (!k || seen.has(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys;
}

/**
 * @param {HifzSelectionSpec} spec
 * @param {ChapterLike[]} chapters
 * @param {{ fetchPage?: (page: number) => Promise<Array<{ verse_key?: string }>> }} [options]
 * @returns {Promise<{ keys: string[], error?: string }>}
 */
export async function expandSelectionToVerseKeys(spec, chapters, options = {}) {
  if (spec?.mode === "page") {
    const page = parseInt(spec.mushafPage, 10);
    if (!Number.isFinite(page) || page < 1 || page > 604) {
      return { keys: [], error: "Invalid mushaf page (1–604)." };
    }
    const fetchPage = options.fetchPage ?? defaultFetchPage;
    try {
      const verses = await fetchPage(page);
      const keys = verseKeysFromPageVerses(verses);
      return keys.length ? { keys } : { keys: [], error: "No verses on this page." };
    } catch {
      return { keys: [], error: "Failed to load mushaf page." };
    }
  }
  return expandSelectionToVerseKeysSync(spec, chapters);
}

async function defaultFetchPage(page) {
  const res = await fetch(`/api/verse/by-page?page=${page}&translation=20`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data?.verses ?? [];
}

/**
 * @param {ChapterLike[]} chapters
 * @param {number} surahId
 * @returns {string[]}
 */
function keysForSurah(chapters, surahId) {
  const max = versesCountForSurah(chapters, surahId);
  if (!max) return [];
  const keys = [];
  for (let a = 1; a <= max; a += 1) keys.push(verseKey(surahId, a));
  return keys;
}
