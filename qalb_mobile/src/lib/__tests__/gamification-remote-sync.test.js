import { mergeInitialGamificationSyncMobile } from '../gamification-remote-sync';

describe('mergeInitialGamificationSyncMobile', () => {
  it('promotes local when remote is absent and local has progress', () => {
    const local = {
      xp: 10,
      badges: [],
      badgeLog: [],
      actionLog: [],
      actionsToday: {},
      discovers_count: 0,
      deeds: [],
      deedLog: [],
      total_minutes_spent: 0,
    };
    const { nextState, promoteToServer } = mergeInitialGamificationSyncMobile({
      remoteState: null,
      localState: local,
    });
    expect(promoteToServer).toBe(true);
    expect(nextState.xp).toBeGreaterThanOrEqual(10);
  });

  it('prefers remote when present', () => {
    const { nextState, promoteToServer } = mergeInitialGamificationSyncMobile({
      remoteState: { xp: 200, badges: ['read_10_surahs'] },
      localState: { xp: 10 },
    });
    expect(promoteToServer).toBe(false);
    expect(nextState.xp).toBe(200);
    expect(Array.isArray(nextState.badges)).toBe(true);
  });
});
