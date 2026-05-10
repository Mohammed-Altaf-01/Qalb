import { describe, expect, it } from "vitest";

import { aggregateGoalSignals, computeDerivedProgress, juzCheckpointFromPages } from "@/lib/goal-progress";

describe("aggregateGoalSignals", () => {
  it("collects mushaf audio pages", () => {
    const agg = aggregateGoalSignals([
      { event_type: "audio_page_complete", metadata: { mushafPage: 3 }, occurred_at: "2026-05-05T12:00:00.000Z" },
      { event_type: "audio_page_complete", metadata: { mushafPage: 3 }, occurred_at: "2026-05-06T12:00:00.000Z" },
      { event_type: "read_verse_page", metadata: { surahNumber: 2 }, occurred_at: "2026-05-06T12:01:00.000Z" },
    ]);
    expect(agg.audioPages.size).toBe(1);
    expect(agg.readVerseTicks).toBe(1);
    expect(agg.daysWithReads.size).toBe(2);
  });
});

describe("juzCheckpointFromPages", () => {
  it("tracks toward 30 juz", () => {
    const s = new Set();
    for (let p = 1; p <= 42; p++) s.add(p);
    expect(juzCheckpointFromPages(s)).toBe(2);
  });
});

describe("computeDerivedProgress", () => {
  it("complete_quran uses page checkpoints", () => {
    const pages = new Set();
    for (let p = 1; p <= 42; p++) pages.add(p);
    const agg = { readVerseTicks: 0, audioPages: pages, daysWithReads: new Set(), minutesApprox: 0 };
    expect(computeDerivedProgress({ type: "complete_quran", total: 30, targetDate: "2027-01-01" }, agg)).toBeGreaterThan(0);
  });
});
