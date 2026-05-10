import { describe, expect, it } from "vitest";

import { computeDayStreak } from "@/lib/compute-day-streak";

describe("computeDayStreak", () => {
  it("returns 0 for empty series", () => {
    expect(computeDayStreak({}, "2026-05-10")).toBe(0);
  });

  it("counts contiguous days with sufficient minutes ending at anchor", () => {
    expect(
      computeDayStreak(
        {
          "2026-05-10": 5,
          "2026-05-09": 3,
          "2026-05-08": 1,
          "2026-05-07": 0,
        },
        "2026-05-10",
        1,
      ),
    ).toBe(3);
  });

  it("stops after first gap", () => {
    expect(
      computeDayStreak(
        {
          "2026-05-10": 10,
          "2026-05-09": 0,
          "2026-05-08": 10,
        },
        "2026-05-10",
        1,
      ),
    ).toBe(1);
  });
});
