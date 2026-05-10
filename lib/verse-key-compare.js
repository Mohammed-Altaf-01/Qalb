/**
 * Lexicographic order on canonical `surah:ayah` keys (both 1-based).
 * @returns {-1|0|1}
 */
export function compareVerseKey(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return 0;
  const pa = a.split(":").map((n) => parseInt(n, 10));
  const pb = b.split(":").map((n) => parseInt(n, 10));
  if (pa.length < 2 || pb.length < 2) return 0;
  if (pa[0] !== pb[0]) return pa[0] < pb[0] ? -1 : 1;
  if (pa[1] !== pb[1]) return pa[1] < pb[1] ? -1 : 1;
  return 0;
}

/** Smallest key in a verse_mapping–style object, or null. */
export function minVerseKeyFromMapping(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  let best = null;
  for (const k of Object.keys(map)) {
    if (!/^\d+:\d+$/.test(k)) continue;
    if (best == null || compareVerseKey(k, best) < 0) best = k;
  }
  return best;
}
