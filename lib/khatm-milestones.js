/**
 * Khatm milestone tracking (30 / 50 / 100 %) — overall and per-juz.
 */
import { toast } from "sonner";

export const LS_KHATM_MILESTONES = "qalb_khatm_milestones_v1";
export const KHATM_MILESTONE_THRESHOLDS = [30, 50, 100];

/**
 * @typedef {{ overall: number[], juz: Record<string, number[]> }} KhatmMilestonesAchieved
 */

/**
 * @returns {KhatmMilestonesAchieved}
 */
export function loadKhatmMilestonesAchieved() {
  if (typeof window === "undefined") return { overall: [], juz: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KHATM_MILESTONES) ?? "null");
    if (!raw || typeof raw !== "object") return { overall: [], juz: {} };
    const overall = Array.isArray(raw.overall) ? raw.overall.filter((n) => KHATM_MILESTONE_THRESHOLDS.includes(n)) : [];
    const juz = {};
    if (raw.juz && typeof raw.juz === "object") {
      for (const [k, arr] of Object.entries(raw.juz)) {
        if (!Array.isArray(arr)) continue;
        juz[k] = arr.filter((n) => KHATM_MILESTONE_THRESHOLDS.includes(n));
      }
    }
    return { overall, juz };
  } catch {
    return { overall: [], juz: {} };
  }
}

/**
 * @param {KhatmMilestonesAchieved} achieved
 */
export function saveKhatmMilestonesAchieved(achieved) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KHATM_MILESTONES, JSON.stringify(achieved));
  } catch {
    /* quota */
  }
}

/**
 * @param {{ overallPct: number, juzs: Array<{ num: number, pct: number }> }} beforeStats
 * @param {{ overallPct: number, juzs: Array<{ num: number, pct: number }> }} afterStats
 * @param {KhatmMilestonesAchieved} achieved
 * @returns {Array<{ scope: 'overall' | 'juz', threshold: number, juzNum?: number }>}
 */
export function getNewlyCrossedMilestones(beforeStats, afterStats, achieved) {
  /** @type {Array<{ scope: 'overall' | 'juz', threshold: number, juzNum?: number }>} */
  const out = [];

  for (const threshold of KHATM_MILESTONE_THRESHOLDS) {
    if (beforeStats.overallPct < threshold && afterStats.overallPct >= threshold) {
      if (!achieved.overall.includes(threshold)) {
        out.push({ scope: "overall", threshold });
      }
    }
  }

  for (const j of afterStats.juzs) {
    const beforeJ = beforeStats.juzs.find((x) => x.num === j.num);
    const beforePct = beforeJ?.pct ?? 0;
    const key = String(j.num);
    const juzAchieved = achieved.juz[key] ?? [];
    for (const threshold of KHATM_MILESTONE_THRESHOLDS) {
      if (beforePct < threshold && j.pct >= threshold) {
        if (!juzAchieved.includes(threshold)) {
          out.push({ scope: "juz", threshold, juzNum: j.num });
        }
      }
    }
  }

  return out;
}

/**
 * @param {{ overallPct: number, juzs: Array<{ num: number, pct: number }> }} beforeStats
 * @param {{ overallPct: number, juzs: Array<{ num: number, pct: number }> }} afterStats
 */
export function checkKhatmMilestones(beforeStats, afterStats) {
  if (typeof window === "undefined") return;
  const achieved = loadKhatmMilestonesAchieved();
  const crossed = getNewlyCrossedMilestones(beforeStats, afterStats, achieved);
  if (!crossed.length) return;

  for (const item of crossed) {
    if (item.scope === "overall") {
      if (!achieved.overall.includes(item.threshold)) {
        achieved.overall.push(item.threshold);
        achieved.overall.sort((a, b) => a - b);
      }
      toast.success(`Khatm — ${item.threshold}% of the Quran`, {
        description: "Mabrook on your progress. Keep going.",
      });
    } else if (item.scope === "juz" && item.juzNum != null) {
      const key = String(item.juzNum);
      if (!achieved.juz[key]) achieved.juz[key] = [];
      if (!achieved.juz[key].includes(item.threshold)) {
        achieved.juz[key].push(item.threshold);
        achieved.juz[key].sort((a, b) => a - b);
      }
      toast.success(`Juz ${item.juzNum} — ${item.threshold}% complete`, {
        description: "Well done. Continue your khatm journey.",
      });
    }
  }

  saveKhatmMilestonesAchieved(achieved);
}
