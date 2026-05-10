import { describe, expect, it } from "vitest";

import { buildHeatmapDayCells, heatmapToneClass, todayLocalDayKey } from "@/lib/activity-heatmap";
import { toLocalDayKey } from "@/lib/local-calendar-day";

function localCalendarNoonAtOffset(deltaDays) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + deltaDays, 12, 0, 0, 0);
}

describe("buildHeatmapDayCells", () => {
  it("adds today touch when no events but flag set", () => {
    const today = todayLocalDayKey();
    const cells = buildHeatmapDayCells([], { days: 120, todayClientTouched: true });
    const t = cells.find((c) => c.key === today);
    expect(t?.count).toBe(1);
  });

  it("counts events and hour spread (local calendar day)", () => {
    const d1 = new Date(2026, 0, 15, 10, 0, 0, 0);
    const d2 = new Date(2026, 0, 15, 14, 0, 0, 0);
    const key = toLocalDayKey(d1);
    const cells = buildHeatmapDayCells(
      [
        { created_at: d1.toISOString(), event_type: "a" },
        { created_at: d2.toISOString(), event_type: "b" },
      ],
      { days: 400 },
    );
    const c = cells.find((x) => x.key === key);
    expect(c?.count).toBe(2);
    expect(c?.hourSpread).toBeGreaterThanOrEqual(1);
    expect(c?.intensity).toBeGreaterThanOrEqual(2);
  });

  it("merges minutesByDay into intensity when there are no events", () => {
    const key = toLocalDayKey(localCalendarNoonAtOffset(-2));
    const cells = buildHeatmapDayCells([], { days: 120, minutesByDay: new Map([[key, 30]]) });
    const c = cells.find((x) => x.key === key);
    expect(c?.count).toBe(1);
    expect(c?.intensity).toBeGreaterThan(0);
  });
});

describe("heatmapToneClass", () => {
  it("returns muted for zero", () => {
    expect(heatmapToneClass(0, 10)).toContain("muted");
  });
});
