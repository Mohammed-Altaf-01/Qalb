import { describe, expect, it } from "vitest";

import {
  getKhatmStats,
  juzPageStats,
  loadKhatmPages,
  markKhatmPage,
  normalizeKhatmPages,
  saveKhatmPages,
} from "@/lib/khatm-progress";

describe("khatm-progress", () => {
  it("normalizeKhatmPages filters invalid and dedupes", () => {
    expect(normalizeKhatmPages([1, 1, 2, 0, 700, "x"])).toEqual([1, 2]);
  });

  it("juz 1 spans pages 1–21", () => {
    const read = new Set([1, 2, 21]);
    const s = juzPageStats(1, read);
    expect(s.firstPage).toBe(1);
    expect(s.lastPage).toBe(21);
    expect(s.total).toBe(21);
    expect(s.done).toBe(3);
  });

  it("juz 30 ends at page 604", () => {
    const s = juzPageStats(30, new Set([604]));
    expect(s.firstPage).toBe(582);
    expect(s.lastPage).toBe(604);
    expect(s.done).toBe(1);
  });

  it("getKhatmStats overall percent", () => {
    const read = new Set(Array.from({ length: 604 }, (_, i) => i + 1));
    const stats = getKhatmStats(read);
    expect(stats.done).toBe(604);
    expect(stats.overallPct).toBe(100);
    expect(stats.juzs).toHaveLength(30);
  });

  it("markKhatmPage is idempotent for same page", () => {
    if (typeof window === "undefined") return;
    const before = loadKhatmPages();
    const page = 99;
    if (before.has(page)) before.delete(page);
    saveKhatmPages(before);
    expect(markKhatmPage(page)).toBe(true);
    expect(markKhatmPage(page)).toBe(false);
    const after = loadKhatmPages();
    expect(after.has(page)).toBe(true);
    after.delete(page);
    saveKhatmPages(after);
  });
});
