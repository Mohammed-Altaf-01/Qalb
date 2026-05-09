/** Recent AI discover searches (localStorage + optional cloud via activity). */

export const LS_DISCOVER_HISTORY = "qalb_discover_history";
export const MAX_DISCOVER_HISTORY = 25;

/**
 * @param {{ situationSnippet: string; verseKeys: string[]; at?: number }} entry
 * @param {unknown} existingRaw
 */
export function appendDiscoverHistory(entry, existingRaw) {
  let list = [];
  try {
    const parsed = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw;
    list = Array.isArray(parsed) ? parsed : [];
  } catch {
    list = [];
  }
  const row = {
    situationSnippet: String(entry.situationSnippet ?? "").slice(0, 200),
    verseKeys: Array.isArray(entry.verseKeys) ? entry.verseKeys.filter((k) => typeof k === "string").slice(0, 5) : [],
    at: typeof entry.at === "number" ? entry.at : Date.now(),
  };
  const next = [row, ...list.filter((r) => r?.situationSnippet !== row.situationSnippet)].slice(0, MAX_DISCOVER_HISTORY);
  return next;
}
