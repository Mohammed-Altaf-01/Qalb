import { bucketDayKeyLocal } from "@/lib/local-calendar-day";

/** @typedef {{ event_type?: string, metadata?: object, occurred_at?: string, created_at?: string }} ActivityEvent */

/**
 * @param {ActivityEvent[]} [events]
 * @returns {{ readVerseTicks: number, audioPages: Set<number>, daysWithReads: Set<string>, minutesApprox: number }}
 */
export function aggregateGoalSignals(events) {
  const audioPages = new Set();
  const daysWithReads = new Set();
  let readVerseTicks = 0;
  let minutesApprox = 0;
  for (const e of Array.isArray(events) ? events : []) {
    const t = typeof e?.event_type === "string" ? e.event_type : "";
    const meta = e?.metadata && typeof e.metadata === "object" ? e.metadata : {};
    const iso = typeof e?.occurred_at === "string" ? e.occurred_at : typeof e?.created_at === "string" ? e.created_at : "";
    const dayKey = iso ? bucketDayKeyLocal(iso) : "";
    if (t === "read_verse_page") {
      readVerseTicks++;
      if (dayKey) daysWithReads.add(dayKey);
    }
    if (t === "audio_page_complete" && typeof meta.mushafPage === "number" && meta.mushafPage > 0) {
      audioPages.add(meta.mushafPage);
      if (dayKey) daysWithReads.add(dayKey);
    }
    if (t === "time_spent" && typeof meta.minutes === "number" && Number.isFinite(meta.minutes)) {
      minutesApprox += Math.max(0, meta.minutes);
    }
  }
  return { readVerseTicks, audioPages, daysWithReads, minutesApprox };
}

/**
 * Estimated juz checkpoints from unique mushaf pages (30 juz × ~20 pages/juz heuristic).
 */
export function juzCheckpointFromPages(pageSet) {
  const n = pageSet instanceof Set ? pageSet.size : 0;
  return Math.min(30, Math.floor(n / 21));
}

/**
 * @param {object} goal — UI/API goal with `.type`, `.total`, `.targetDate`, `.createdAt`
 * @param {ReturnType<typeof aggregateGoalSignals>} agg
 */
export function computeDerivedProgress(goal, agg) {
  const daysWindow = typeof goal.targetDate === "string" ? Math.max(1, deadlineSpanDays(goal.targetDate)) : 90;
  const type = typeof goal?.type === "string" ? goal.type : "custom";

  switch (type) {
    case "complete_quran": {
      const total = typeof goal.total === "number" && goal.total > 0 ? goal.total : 30;
      const checkpoints = Math.max(juzCheckpointFromPages(agg.audioPages), Math.min(total, Math.floor(agg.readVerseTicks / 40)));
      return Math.min(total, checkpoints);
    }
    case "daily_verse": {
      const total = typeof goal.total === "number" && goal.total > 0 ? goal.total : daysWindow;
      return Math.min(total, agg.daysWithReads.size);
    }
    case "memorize_surahs":
      return Math.min(goal.total ?? 10, Math.floor(agg.readVerseTicks / 25));
    case "study_tafsir":
      return Math.min(goal.total ?? 12, Math.floor(agg.daysWithReads.size / 7));
    default:
      return Math.min(goal.total ?? daysWindow, Math.floor(agg.minutesApprox / Math.max(goal.dailyMinutes ?? 10, 1)));
  }
}

export function deadlineSpanDays(targetDateIsoDay) {
  const end = new Date(`${targetDateIsoDay.slice(0, 10)}T23:59:59`);
  const start = new Date();
  const diff = end - start;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Map Quran Foundation / generic API goal rows into the `/goals` UI shape.
 * @param {object} raw
 * @param {Array<{ id: string, label: string, description: string, dailyMinutes: number }>} templates
 */
export function normalizeApiGoal(raw, templates) {
  if (!raw || typeof raw !== "object") return null;
  const meta = typeof raw.metadata === "object" && raw.metadata ? raw.metadata : {};
  const templateId = typeof raw.type === "string" ? raw.type : typeof meta.templateId === "string" ? meta.templateId : "custom";
  const tmpl = templates.find((t) => t.id === templateId) ?? templates[templates.length - 1];
  const targetDateRaw = raw.targetDate ?? raw.target_date ?? meta.targetDate;
  const targetDate =
    typeof targetDateRaw === "string" && targetDateRaw.length >= 10 ? targetDateRaw.slice(0, 10) : null;
  const id = raw.id != null ? String(raw.id) : raw.uuid != null ? String(raw.uuid) : null;
  if (!id || !targetDate) return null;
  const progress = Math.max(0, Number(raw.progress ?? raw.current_progress ?? meta.progress ?? 0) || 0);
  const totalDefault = templateId === "complete_quran" ? 30 : deadlineSpanDays(targetDate);
  const total = Math.max(1, Number(raw.total ?? meta.total ?? totalDefault) || totalDefault);
  const dailyMinutes = Number(raw.dailyMinutes ?? raw.daily_minutes ?? tmpl.dailyMinutes ?? 10) || 10;
  return {
    id,
    type: templateId,
    label: typeof meta.label === "string" ? meta.label : tmpl.label,
    description: typeof meta.description === "string" ? meta.description : tmpl.description,
    targetDate,
    dailyMinutes,
    progress,
    total,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
  };
}
