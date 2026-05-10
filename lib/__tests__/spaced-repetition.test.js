import { describe, expect, it } from "vitest";

import { GRADES, scheduleReview } from "@/lib/spaced-repetition";

describe("scheduleReview", () => {
  it("Again resets repetitions", () => {
    const next = scheduleReview({ ef: 2.5, intervalDays: 10, reps: 3, dueDayKey: "" }, GRADES.AGAIN, "2026-05-10");
    expect(next.reps).toBe(0);
    expect(next.intervalDays).toBe(1);
  });

  it("Good increases interval after first laps", () => {
    let c = scheduleReview({}, GRADES.GOOD, "2026-05-10");
    expect(c.intervalDays).toBe(1);
    c = scheduleReview({ ...c, dueDayKey: c.dueDayKey }, GRADES.GOOD, c.dueDayKey);
    expect(c.reps).toBe(2);
    expect(c.intervalDays).toBe(6);
  });
});
