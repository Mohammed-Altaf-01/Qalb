/**
 * Build daily heatmap cells from activity events + optional "today" client touch.
 * Uses event count per day plus distinct local hours for greener tiers on busy days.
 */

export function dayKeyFromIso(iso) {
  return new Date(iso).toISOString().split("T")[0];
}

export function todayLocalDayKey() {
  return new Date().toISOString().split("T")[0];
}

/**
 * @param {Array<{ created_at: string; event_type?: string }>} events
 * @param {{ days?: number; todayClientTouched?: boolean }} [opts]
 * @returns {Array<{ key: string; count: number; hourSpread: number; intensity: number }>}
 */
export function buildHeatmapDayCells(events, opts = {}) {
  const days = typeof opts.days === "number" ? opts.days : 364;
  const todayClientTouched = opts.todayClientTouched === true;

  const counts = new Map();
  const hoursByDay = new Map();

  for (const event of events ?? []) {
    if (!event?.created_at) continue;
    const key = dayKeyFromIso(event.created_at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const h = new Date(event.created_at).getHours();
    if (!hoursByDay.has(key)) hoursByDay.set(key, new Set());
    hoursByDay.get(key).add(h);
  }

  const todayKey = todayLocalDayKey();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().split("T")[0];
    let count = counts.get(key) ?? 0;
    if (key === todayKey && todayClientTouched && count === 0) count = 1;
    const hourSpread = hoursByDay.get(key)?.size ?? 0;
    const intensity = count + Math.min(hourSpread, 8) * 0.2;
    out.push({ key, count, hourSpread, intensity });
  }
  return out;
}

export function heatmapToneClass(intensity, maxIntensity) {
  if (intensity <= 0) return "bg-muted/30 border-border/20";
  const maxI = Math.max(maxIntensity, 0.001);
  const ratio = intensity / maxI;
  if (ratio < 0.2) return "bg-emerald-950/50 border-emerald-800/35";
  if (ratio < 0.45) return "bg-emerald-800/55 border-emerald-600/40";
  if (ratio < 0.7) return "bg-emerald-600/70 border-emerald-400/45";
  return "bg-emerald-400/88 border-emerald-300/55";
}
