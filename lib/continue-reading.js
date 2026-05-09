/**
 * Pick the most recent resume target between Quran and Hadith recent-read lists.
 * Lists are expected newest-first (first item is latest for that category).
 * @param {unknown} quranReads
 * @param {unknown} hadithReads
 * @returns {{ href: string; label?: string; kind: "quran" | "hadith" } | null}
 */
export function pickLatestReadingResume(quranReads, hadithReads) {
  const qList = Array.isArray(quranReads) ? quranReads : [];
  const hList = Array.isArray(hadithReads) ? hadithReads : [];
  const q = qList[0]?.href ? qList[0] : null;
  const h = hList[0]?.href ? hList[0] : null;
  if (!q && !h) return null;

  const qt = typeof q?.timestamp === "number" ? q.timestamp : 0;
  const ht = typeof h?.timestamp === "number" ? h.timestamp : 0;

  if (q && !h) return { href: q.href, label: q.label, kind: "quran" };
  if (h && !q) return { href: h.href, label: h.label, kind: "hadith" };

  if (qt === 0 && ht === 0) {
    return { href: q.href, label: q.label, kind: "quran" };
  }
  return qt >= ht ? { href: q.href, label: q.label, kind: "quran" } : { href: h.href, label: h.label, kind: "hadith" };
}
