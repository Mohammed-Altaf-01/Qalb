import { toLocalDayKey } from "@/lib/local-calendar-day";

function prevDayKey(dayKey) {
  const [y, m, d] = dayKey.slice(0, 10).split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return dayKey;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/**
 * How many consecutive local calendar days (ending at todayKey) meet the activity threshold.
 * @param {Record<string, unknown>} [byDay] —-minute amounts per local YYYY-MM-DD
 * @param {string|null} todayKey — local day key ending the streak segment
 * @param {number} [minMinutes=1]
 */
export function computeDayStreak(byDay, todayKey = null, minMinutes = 1) {
  const td = typeof todayKey === "string" && todayKey.length >= 10 ? todayKey.slice(0, 10) : toLocalDayKey();
  if (!byDay || typeof byDay !== "object") return 0;
  let streak = 0;
  let k = td;
  for (;;) {
    const m = Number(byDay[k]);
    if (!(Number.isFinite(m) && m >= minMinutes)) break;
    streak++;
    k = prevDayKey(k);
  }
  return streak;
}
