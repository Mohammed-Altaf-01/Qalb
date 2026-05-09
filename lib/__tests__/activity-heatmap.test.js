import { describe, expect, it } from "vitest";

import { buildHeatmapDayCells, heatmapToneClass, todayLocalDayKey } from "@/lib/activity-heatmap";

describe("buildHeatmapDayCells", () => {
  it("adds today touch when no events but flag set", () => {
    const today = todayLocalDayKey();
    const cells = buildHeatmapDayCells([], { days: 120, todayClientTouched: true });
    const t = cells.find((c) => c.key === today);
    expect(t?.count).toBe(1);
  });

  it("counts events and hour spread", () => {
    const day = "2026-01-15T10:00:00.000Z";
    const cells = buildHeatmapDayCells(
      [
        { created_at: day, event_type: "a" },
        { created_at: "2026-01-15T14:00:00.000Z", event_type: "b" },
      ],
      { days: 400 },
    );
    const c = cells.find((x) => x.key === "2026-01-15");
    expect(c?.count).toBe(2);
    expect(c?.hourSpread).toBeGreaterThanOrEqual(1);
    expect(c?.intensity).toBeGreaterThanOrEqual(2);
  });
});

describe("heatmapToneClass", () => {
  it("returns muted for zero", () => {
    expect(heatmapToneClass(0, 10)).toContain("muted");
  });
});
