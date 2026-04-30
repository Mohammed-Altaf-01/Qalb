import {
  awardTimeSpent,
  awardXP,
  getLevelInfo,
  normalizeGamificationState,
} from '../gamification';

describe('mobile gamification', () => {
  it('returns level metadata with icon', () => {
    const info = getLevelInfo(0);
    expect(info.current.icon).toBeTruthy();
  });

  it('awards minute-based deeds at thresholds', () => {
    const state = normalizeGamificationState(null);
    const first = awardTimeSpent(state, 15);
    expect(state.total_minutes_spent).toBe(15);
    expect(first.newDeeds.map((d) => d.id)).toContain('minutes_15');

    const second = awardTimeSpent(state, 45);
    expect(state.total_minutes_spent).toBe(60);
    expect(second.newDeeds.map((d) => d.id)).toContain('minutes_60');
  });

  it('tracks discover actions and increments xp', () => {
    const state = normalizeGamificationState(null);
    const result = awardXP(state, 'discover_search');
    expect(result.xpGained).toBeGreaterThan(0);
    expect(state.discovers_count).toBe(1);
  });
});
