/**
 * Home + Read: recent Quran entry points (localStorage).
 * @typedef {{ href: string; label?: string; sub?: string; type?: string; timestamp?: number }} LastReadEntry
 */

export const LS_QALB_LAST_READS = "qalb_last_reads";

export const MAX_QURAN_LAST_READS = 5;

/** Newest-first; first occurrence per href; cap at maxItems. */
export function dedupeLastReadsByHref(items, maxItems = MAX_QURAN_LAST_READS) {
  const seen = new Set();
  const out = [];
  for (const r of items) {
    if (!r?.href || seen.has(r.href)) continue;
    seen.add(r.href);
    out.push(r);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * While scrolling /read, update the stored href for this surah (one row per surah).
 * @param {LastReadEntry[]} entries
 * @param {{ chapterId: number; verseNum: number; chapterName: string; subtitle?: string }} pos
 */
export function touchReadingProgress(entries, { chapterId, verseNum, chapterName, subtitle = "" }) {
  const newHref = `/read?surah=${chapterId}&startVerse=${verseNum}`;
  const filtered = entries.filter((r) => !String(r.href).match(new RegExp(`[?&]surah=${chapterId}(&|$)`)));
  return dedupeLastReadsByHref([
    {
      href: newHref,
      label: chapterName ?? `Surah ${chapterId}`,
      sub: subtitle,
      type: "read",
      timestamp: Date.now(),
    },
    ...filtered,
  ]);
}
