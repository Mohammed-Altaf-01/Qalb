/**
 * Minimal SM-2 style interval for hifz recall grades.
 * Grade: 0 Again, 1 Hard, 2 Good, 3 Easy — maps to Anki-ish ease.
 */

/** @typedef {{ ef: number, intervalDays: number, reps: number, dueDayKey: string }} CardScheduling */

export const GRADES = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

export function scheduleReview(card, grade, todayDayKey) {
  let ef = typeof card?.ef === "number" && Number.isFinite(card.ef) ? card.ef : 2.5;
  let intervalDays = typeof card?.intervalDays === "number" && card.intervalDays > 0 ? card.intervalDays : 0;
  let reps = typeof card?.reps === "number" && card.reps >= 0 ? card.reps : 0;

  const g = typeof grade === "number" ? grade : GRADES.GOOD;
  if (g <= GRADES.AGAIN) {
    reps = 0;
    intervalDays = 1;
    ef = Math.max(1.3, ef - 0.2);
  } else {
    reps += 1;
    let q = 0;
    if (g === GRADES.HARD) q = 3;
    if (g === GRADES.GOOD) q = 4;
    if (g === GRADES.EASY) q = 5;
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * ef));
  }

  const due = daysFromDayKey(todayDayKey, intervalDays);
  return { ef, intervalDays, reps, dueDayKey: due };
}

function daysFromDayKey(dayKey, addDays) {
  const base = parseDayKey(dayKey);
  base.setDate(base.getDate() + addDays);
  const mm = String(base.getMonth() + 1).padStart(2, "0");
  const dd = String(base.getDate()).padStart(2, "0");
  return `${base.getFullYear()}-${mm}-${dd}`;
}

function parseDayKey(key) {
  const [y, m, d] = String(key)
    .slice(0, 10)
    .split("-")
    .map((n) => parseInt(n, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}
