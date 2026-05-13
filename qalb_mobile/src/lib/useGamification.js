import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import {
  GAMIFICATION_REMOTE_SYNC_DEBOUNCE_MS,
  MINUTE_TICK_MS,
  TIME_SPENT_INCREMENT_MINUTES,
} from "../constants/gamification";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "./api-with-auth";
import {
  awardTimeSpent,
  awardXP,
  defaultGamificationState,
  getLevelInfo,
  normalizeGamificationState,
} from "./gamification";
import { mergeInitialGamificationSyncMobile } from "./gamification-remote-sync";
import storage, { STORAGE_KEYS } from "./storage";

export default function useGamification() {
  const { isSignedIn, hydrated } = useAuth();
  const [state, setState] = useState(defaultGamificationState());
  const syncEnabledRef = useRef(false);
  const debounceRef = useRef(null);

  const flushRemote = useCallback(async (st) => {
    if (!syncEnabledRef.current) return;
    try {
      await apiFetch("/api/user/gamification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: st }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const scheduleRemoteSave = useCallback(
    (st) => {
      if (!syncEnabledRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const snapshot = JSON.parse(JSON.stringify(st));
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flushRemote(snapshot);
      }, GAMIFICATION_REMOTE_SYNC_DEBOUNCE_MS);
    },
    [flushRemote],
  );

  const loadLocalOnly = useCallback(async () => {
    const raw = await storage.get(STORAGE_KEYS.GAMIFICATION);
    const normalized = normalizeGamificationState(raw);
    setState({ ...normalized });
    await storage.set(STORAGE_KEYS.GAMIFICATION, normalized);
  }, []);

  const syncFromCloud = useCallback(async () => {
    if (!hydrated) return;

    if (!isSignedIn) {
      syncEnabledRef.current = false;
      await loadLocalOnly();
      return;
    }

    try {
      const res = await apiFetch("/api/user/gamification");
      const data = await res.json();
      if (!res.ok || data.enabled !== true) {
        syncEnabledRef.current = false;
        await loadLocalOnly();
        return;
      }

      syncEnabledRef.current = true;
      const localRaw = await storage.get(STORAGE_KEYS.GAMIFICATION);
      const { nextState, promoteToServer } = mergeInitialGamificationSyncMobile({
        remoteState: data.state,
        localState: localRaw,
      });
      const norm = normalizeGamificationState(nextState);
      await storage.set(STORAGE_KEYS.GAMIFICATION, norm);
      setState({ ...norm });
      if (promoteToServer) await flushRemote(norm);
    } catch {
      syncEnabledRef.current = false;
      await loadLocalOnly();
    }
  }, [hydrated, isSignedIn, loadLocalOnly, flushRemote]);

  useEffect(() => {
    void syncFromCloud();
  }, [syncFromCloud]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const draft = { ...prev };
        const result = awardTimeSpent(draft, TIME_SPENT_INCREMENT_MINUTES);
        void storage.set(STORAGE_KEYS.GAMIFICATION, draft);
        scheduleRemoteSave(draft);
        if ((result.newDeeds?.length ?? 0) > 0) {
          Alert.alert("Deed earned", result.newDeeds.map((d) => `${d.icon} ${d.title}`).join("\n"));
        }
        return draft;
      });
    }, MINUTE_TICK_MS);
    return () => clearInterval(id);
  }, [scheduleRemoteSave]);

  const award = useCallback(
    async (actionKey) => {
      setState((prev) => {
        const draft = {
          ...prev,
          actionsToday: { ...(prev.actionsToday ?? {}) },
          actionLog: [...(prev.actionLog ?? [])],
        };
        awardXP(draft, actionKey);
        void storage.set(STORAGE_KEYS.GAMIFICATION, draft);
        scheduleRemoteSave(draft);
        return draft;
      });
    },
    [scheduleRemoteSave],
  );

  return {
    state,
    award,
    levelInfo: getLevelInfo(state?.xp ?? 0),
    reloadGamification: syncFromCloud,
  };
}
