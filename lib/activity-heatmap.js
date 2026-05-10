/**
 * Build daily heatmap cells from activity events + optional `byDay` minutes + "today" client touch.
 * All day keys use the user's local calendar (aligned with `qalb_time_tracking.byDay`).
 */

import { bucketDayKeyLocal, toLocalDayKey } from "@/lib/local-calendar-day";

/** @deprecated Use bucketDayKeyLocal — alias for backwards compatibility */
export function dayKeyFromIso(iso) {
  return bucketDayKeyLocal(iso);
}

export function todayLocalDayKey() {
  return toLocalDayKey(new Date());
}

/** Local calendar noon for `deltaDays` from today (helps avoid DST edge cases). */
function localCalendarDayAtOffset(deltaDays) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + deltaDays, 12, 0, 0, 0);
}

function minutesIntensityBonus(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return Math.min(8, Math.log1p(m) * 1.15);
}

/**
 * @param {Array<{ created_at: string; event_type?: string }>} events
 * @param {{ days?: number; todayClientTouched?: boolean; minutesByDay?: Map<string, number> }} [opts]
 * @returns {Array<{ key: string; count: number; hourSpread: number; intensity: number }>}
 */
export function buildHeatmapDayCells(events, opts = {}) {
  const days = typeof opts.days === "number" ? opts.days : 364;
  const todayClientTouched = opts.todayClientTouched === true;
  const minutesByDay =
    opts.minutesByDay instanceof Map
      ? opts.minutesByDay
      : opts.minutesByDay && typeof opts.minutesByDay === "object"
        ? new Map(Object.entries(opts.minutesByDay))
        : new Map();

  const counts = new Map();
  const hoursByDay = new Map();

  for (const event of events ?? []) {
    if (!event?.created_at) continue;
    const key = bucketDayKeyLocal(event.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const h = new Date(event.created_at).getHours();
    if (!hoursByDay.has(key)) hoursByDay.set(key, new Set());
    hoursByDay.get(key).add(h);
  }

  const todayKey = todayLocalDayKey();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const cellDate = localCalendarDayAtOffset(-i);
    const key = toLocalDayKey(cellDate);
    let count = counts.get(key) ?? 0;
    const minsFromTracking = Number(minutesByDay.get(key) ?? 0);
    if (minsFromTracking > 0 && count === 0) count = 1;
    if (key === todayKey && todayClientTouched && count === 0) count = 1;
    const hourSpread = hoursByDay.get(key)?.size ?? 0;
    const intensity = count + Math.min(hourSpread, 8) * 0.2 + minutesIntensityBonus(minsFromTracking);
    out.push({ key, count, hourSpread, intensity });
  }
  return out;
}

export function heatmapToneClass(intensity, maxIntensity) {
  if (intensity <= 0) return "bg-muted/30 border-border/20";
  const maxI = Math.max(maxIntensity, 0.001);
  const ratio = intensity / maxI;
  if (ratio < 0.2) return "bg-emerald-900/65 border-emerald-700/40";
  if (ratio < 0.45) return "bg-emerald-800/55 border-emerald-600/40";
  if (ratio < 0.7) return "bg-emerald-600/70 border-emerald-400/45";
  return "bg-emerald-400/88 border-emerald-300/55";
}
