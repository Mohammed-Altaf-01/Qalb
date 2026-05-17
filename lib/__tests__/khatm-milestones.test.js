import { describe, expect, it } from "vitest";

import { KHATM_MILESTONE_THRESHOLDS, getNewlyCrossedMilestones } from "@/lib/khatm-milestones";
import { getKhatmStats } from "@/lib/khatm-progress";

function pagesForJuzPct(juzNum, pct) {
  const stats = getKhatmStats(new Set());
  const j = stats.juzs.find((x) => x.num === juzNum);
  if (!j) return new Set();
  const need = Math.ceil((pct / 100) * j.total);
  const pages = new Set();
  for (let p = j.firstPage; p < j.firstPage + need && p <= j.lastPage; p += 1) {
    pages.add(p);
  }
  return pages;
}

describe("getNewlyCrossedMilestones", () => {
  it("detects overall 30% crossing", () => {
    const before = getKhatmStats(new Set([1, 2]));
    const afterPages = new Set();
    for (let p = 1; p <= Math.ceil(604 * 0.3); p += 1) afterPages.add(p);
    const after = getKhatmStats(afterPages);
    const crossed = getNewlyCrossedMilestones(before, after, { overall: [], juz: {} });
    expect(crossed.some((c) => c.scope === "overall" && c.threshold === 30)).toBe(true);
  });

  it("does not re-fire already achieved overall 30", () => {
    const pages = new Set();
    for (let p = 1; p <= Math.ceil(604 * 0.35); p += 1) pages.add(p);
    const before = getKhatmStats(new Set());
    const after = getKhatmStats(pages);
    const crossed = getNewlyCrossedMilestones(before, after, { overall: [30], juz: {} });
    expect(crossed.some((c) => c.scope === "overall" && c.threshold === 30)).toBe(false);
  });

  it("detects juz milestone crossing", () => {
    const before = getKhatmStats(new Set());
    const after = getKhatmStats(pagesForJuzPct(1, 50));
    const crossed = getNewlyCrossedMilestones(before, after, { overall: [], juz: {} });
    expect(crossed.some((c) => c.scope === "juz" && c.juzNum === 1 && c.threshold === 30)).toBe(true);
    expect(crossed.some((c) => c.scope === "juz" && c.juzNum === 1 && c.threshold === 50)).toBe(true);
  });

  it("uses all standard thresholds", () => {
    expect(KHATM_MILESTONE_THRESHOLDS).toEqual([30, 50, 100]);
  });
});
