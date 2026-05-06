/**
 * Home: recent hadith sections (localStorage).
 * @typedef {{ href: string; label: string; sub?: string; timestamp?: number }} LastHadithEntry
 */

export const LS_LAST_HADITH_READS = "qalb_last_hadith_reads";

export const MAX_LAST_HADITH_READS = 5;

/** Newest-first; first occurrence per href. */
export function dedupeLastHadithByHref(items, maxItems = MAX_LAST_HADITH_READS) {
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

export function mergeHadithVisit(existing, entry, maxItems = MAX_LAST_HADITH_READS) {
  const filtered = existing.filter((r) => r.href !== entry.href);
  return dedupeLastHadithByHref([{ ...entry, timestamp: Date.now() }, ...filtered], maxItems);
}
