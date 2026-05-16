/** @typedef {{ name: string, at: Date }} PrayerSlot */

const DEFAULT_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

/**
 * Parse HH:MM (optionally with timezone suffix) into today’s local Date.
 * @param {string} hhmm
 * @returns {Date | null}
 */
export function parsePrayerTimeToday(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm).trim());
  if (!m) return null;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d;
}

/**
 * @param {Record<string, string>} timings
 * @param {string[]} [order]
 * @returns {PrayerSlot[]}
 */
export function buildPrayerSlots(timings, order = DEFAULT_ORDER) {
  /** @type {PrayerSlot[]} */
  const slots = [];
  for (const name of order) {
    const s = timings[name];
    if (typeof s !== "string") continue;
    const at = parsePrayerTimeToday(s);
    if (at) slots.push({ name, at });
  }
  slots.sort((a, b) => a.at.getTime() - b.at.getTime());
  return slots;
}

/**
 * @param {PrayerSlot[]} slots
 * @param {number} [nowMs]
 * @returns {PrayerSlot | null}
 */
export function pickNextPrayer(slots, nowMs = Date.now()) {
  if (!slots.length) return null;
  const next = slots.find((x) => x.at.getTime() > nowMs);
  return next ?? slots[0];
}

/**
 * @param {Date} date
 * @returns {string}
 */
export function formatPrayerTime12h(date) {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
}
