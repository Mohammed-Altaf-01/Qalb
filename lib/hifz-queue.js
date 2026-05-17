/**
 * Hifz revision queue and card deck helpers.
 */

/**
 * @typedef {object} CardScheduling
 * @property {number} ef
 * @property {number} intervalDays
 * @property {number} reps
 * @property {string} dueDayKey
 */

/**
 * @typedef {object} HifzCard
 * @property {CardScheduling} [scheduling]
 * @property {number} [updatedAt]
 */

/**
 * @param {string} todayDayKey
 * @returns {CardScheduling}
 */
export function createDefaultScheduling(todayDayKey) {
  return { ef: 2.5, intervalDays: 0, reps: 0, dueDayKey: todayDayKey };
}

/**
 * @param {HifzCard | undefined} card
 * @param {string} todayDayKey
 */
export function isCardDue(card, todayDayKey) {
  const due = card?.scheduling?.dueDayKey;
  if (!due || typeof due !== "string") return true;
  return due <= todayDayKey;
}

/**
 * @param {Record<string, HifzCard>} cards
 * @param {string} todayDayKey
 * @returns {string[]}
 */
export function buildRevisionQueue(cards, todayDayKey) {
  const entries = Object.entries(cards ?? {}).filter(([, c]) => isCardDue(c, todayDayKey));

  entries.sort((a, b) => {
    const da = a[1]?.scheduling?.dueDayKey ?? "";
    const db = b[1]?.scheduling?.dueDayKey ?? "";
    if (da !== db) return da.localeCompare(db);
    const ra = a[1]?.scheduling?.reps ?? 0;
    const rb = b[1]?.scheduling?.reps ?? 0;
    return ra - rb;
  });

  return entries.map(([k]) => k);
}

/**
 * @param {Record<string, HifzCard>} cards
 * @param {string[]} keys
 * @param {string} todayDayKey
 * @returns {{ next: Record<string, HifzCard>, added: number }}
 */
export function mergeKeysIntoDeck(cards, keys, todayDayKey) {
  const next = { ...(cards ?? {}) };
  let added = 0;
  const now = Date.now();
  for (const key of keys) {
    const k = String(key).trim();
    if (!k || next[k]) continue;
    next[k] = { scheduling: createDefaultScheduling(todayDayKey), updatedAt: now };
    added += 1;
  }
  return { next, added };
}

/**
 * @param {Record<string, HifzCard>} cards
 * @param {string} todayDayKey
 */
export function countDueCards(cards, todayDayKey) {
  return Object.values(cards ?? {}).filter((c) => isCardDue(c, todayDayKey)).length;
}
