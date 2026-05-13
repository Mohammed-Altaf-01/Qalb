import { describe, expect, it } from "vitest";

import { hasPromotableLocalProgress, mergeInitialGamificationSync } from "@/lib/gamification-merge";

describe("gamification-merge", () => {
  it("hasPromotableLocalProgress is false for empty-like state", () => {
    expect(
      hasPromotableLocalProgress({
        xp: 0,
        badges: [],
        deeds: [],
        total_minutes_spent: 0,
        actionLog: [],
        discovers_count: 0,
      }),
    ).toBe(false);
  });

  it("hasPromotableLocalProgress is true when xp > 0", () => {
    expect(hasPromotableLocalProgress({ xp: 5, badges: [] })).toBe(true);
  });

  it("when server has no row and local has progress, promote", () => {
    const local = { xp: 50, badges: ["first_bookmark"], deeds: [], actionLog: [] };
    const { nextState, promoteToServer } = mergeInitialGamificationSync({
      remoteState: null,
      localState: local,
    });
    expect(promoteToServer).toBe(true);
    expect(nextState.xp).toBe(50);
    expect(nextState.badges).toContain("first_bookmark");
  });

  it("when server has no row and local is empty, do not promote", () => {
    const { promoteToServer } = mergeInitialGamificationSync({
      remoteState: null,
      localState: { xp: 0, badges: [], deeds: [], actionLog: [] },
    });
    expect(promoteToServer).toBe(false);
  });

  it("when server has row, server wins and no promote", () => {
    const local = { xp: 999, badges: [] };
    const remote = { xp: 10, badges: [], deeds: [], actionLog: [] };
    const { nextState, promoteToServer } = mergeInitialGamificationSync({
      remoteState: remote,
      localState: local,
    });
    expect(promoteToServer).toBe(false);
    expect(nextState.xp).toBe(10);
  });
});
