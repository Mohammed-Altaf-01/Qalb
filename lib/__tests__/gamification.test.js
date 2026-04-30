import { awardTimeSpent, awardXP, getLevelInfo, loadState } from "@/lib/gamification";

describe("gamification", () => {
  it("includes level icons in level info", () => {
    const info = getLevelInfo(0);
    expect(info.current.icon).toBeTruthy();
  });

  it("awards time-based deeds at minute thresholds", () => {
    const state = loadState(null);
    const first = awardTimeSpent(state, 15);
    expect(state.total_minutes_spent).toBe(15);
    expect(first.newDeeds.map((d) => d.id)).toContain("minutes_15");

    const second = awardTimeSpent(state, 45);
    expect(state.total_minutes_spent).toBe(60);
    expect(second.newDeeds.map((d) => d.id)).toContain("minutes_60");
  });

  it("tracks action counters and awards known action xp", () => {
    const state = loadState(null);
    const result = awardXP(state, "discover_search");
    expect(result.xpGained).toBeGreaterThan(0);
    expect(state.discovers_count).toBe(1);
  });
});
