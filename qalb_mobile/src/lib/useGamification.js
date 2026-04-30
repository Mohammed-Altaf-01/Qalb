import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { MINUTE_TICK_MS, TIME_SPENT_INCREMENT_MINUTES } from '../constants/gamification';
import storage, { STORAGE_KEYS } from './storage';
import {
  awardTimeSpent,
  awardXP,
  defaultGamificationState,
  getLevelInfo,
  normalizeGamificationState,
} from './gamification';

export default function useGamification() {
  const [state, setState] = useState(defaultGamificationState());

  const load = useCallback(async () => {
    const raw = await storage.get(STORAGE_KEYS.GAMIFICATION);
    const normalized = normalizeGamificationState(raw);
    setState({ ...normalized });
    await storage.set(STORAGE_KEYS.GAMIFICATION, normalized);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(async () => {
      setState((prev) => {
        const draft = { ...prev };
        const result = awardTimeSpent(draft, TIME_SPENT_INCREMENT_MINUTES);
        storage.set(STORAGE_KEYS.GAMIFICATION, draft);
        if ((result.newDeeds?.length ?? 0) > 0) {
          Alert.alert('Deed earned', result.newDeeds.map((d) => `${d.icon} ${d.title}`).join('\n'));
        }
        return draft;
      });
    }, MINUTE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const award = useCallback(async (actionKey) => {
    setState((prev) => {
      const draft = { ...prev, actionsToday: { ...(prev.actionsToday ?? {}) }, actionLog: [...(prev.actionLog ?? [])] };
      awardXP(draft, actionKey);
      storage.set(STORAGE_KEYS.GAMIFICATION, draft);
      return draft;
    });
  }, []);

  return { state, award, levelInfo: getLevelInfo(state?.xp ?? 0), reloadGamification: load };
}
