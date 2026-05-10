"use client";

/**
 * useGamification — React hook that wraps the gamification engine.
 *
 * Usage:
 *   const { state, award } = useGamification();
 *   award("bookmark_verse");           // award XP + show toast
 *   award("read_verse_page", { surahNumber: 2 });
 *
 * When signed in and Supabase is configured, state syncs via GET/PATCH /api/user/gamification.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  GAMIFICATION_MINUTE_TICK_MS,
  GAMIFICATION_REMOTE_SYNC_DEBOUNCE_MS,
} from "@/lib/constants/gamification";
import { toLocalDayKey } from "@/lib/local-calendar-day";
import { QALB_TIME_TRACKING_UPDATED_EVENT } from "@/lib/qalb-storage-keys";
import { LS_TIME_TRACKING, schedulePushGoalsLocal } from "@/lib/user-app-sync-bridge";

import { mergeInitialGamificationSync } from "./gamification-merge";
import {
  awardDailyLogin,
  awardTimeSpent,
  awardXP,
  getLevelInfo,
  loadState,
  normalizeGamificationState,
  saveState,
} from "./gamification";

function patchGamificationRemote(state) {
  return fetch("/api/user/gamification", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
}

function recordActivity(event_type, metadata = {}) {
  return fetch("/api/user/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type, metadata }),
  });
}

function persistTimeTracking(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0 || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_TIME_TRACKING);
    const parsed = raw ? JSON.parse(raw) : {};
    const byDay =
      parsed && typeof parsed === "object" && parsed.byDay && typeof parsed.byDay === "object" ? parsed.byDay : {};
    const day = toLocalDayKey();
    byDay[day] = Math.max(0, Number(byDay[day] ?? 0)) + minutes;
    const totalMinutes = Math.max(0, Number(parsed?.totalMinutes ?? 0)) + minutes;
    localStorage.setItem(
      LS_TIME_TRACKING,
      JSON.stringify({
        byDay,
        totalMinutes,
        updatedAt: Date.now(),
      }),
    );
    window.dispatchEvent(new CustomEvent(QALB_TIME_TRACKING_UPDATED_EVENT));
    schedulePushGoalsLocal();
  } catch {
    /* ignore */
  }
}

export function useGamification() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "guest";

  const [state, setState] = useState(null);
  const syncEnabledRef = useRef(false);
  const debounceRef = useRef(null);
  const visibleStartedAtRef = useRef(Date.now());
  const pendingMsRef = useRef(0);

  const flushRemote = useCallback(async (uid, st) => {
    if (uid === "guest" || !syncEnabledRef.current) return;
    try {
      await patchGamificationRemote(st);
    } catch {
      /* ignore */
    }
  }, []);

  const trackActivity = useCallback(async (uid, eventType, metadata = {}) => {
    if (uid === "guest") return;
    try {
      await recordActivity(eventType, metadata);
    } catch {
      /* ignore */
    }
  }, []);

  const scheduleRemoteSave = useCallback(
    (uid, st) => {
      if (uid === "guest" || !syncEnabledRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const snapshot = structuredClone(st);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void flushRemote(uid, snapshot);
      }, GAMIFICATION_REMOTE_SYNC_DEBOUNCE_MS);
    },
    [flushRemote],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Load + remote sync (guest: local only)
  useEffect(() => {
    let cancelled = false;
    syncEnabledRef.current = false;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const run = async () => {
      if (userId === "guest") {
        const loaded = loadState(userId);
        const d = structuredClone(loaded);
        const daily = awardDailyLogin(d);
        if (daily.xpGained > 0) saveState(userId, d);
        if (!cancelled) setState(d);
        return;
      }

      const local = loadState(userId);

      try {
        const res = await fetch("/api/user/gamification");
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (cancelled) return;

        const remoteEnabled = json.enabled === true;
        syncEnabledRef.current = remoteEnabled;

        if (!remoteEnabled) {
          const d = structuredClone(normalizeGamificationState(local));
          const daily = awardDailyLogin(d);
          if (daily.xpGained > 0) saveState(userId, d);
          setState(d);
          return;
        }

        const { nextState, promoteToServer } = mergeInitialGamificationSync({
          remoteState: json.state ?? null,
          localState: local,
        });
        const working = structuredClone(nextState);
        const daily = awardDailyLogin(working);
        saveState(userId, working);
        setState(working);

        if (remoteEnabled && (promoteToServer || daily.xpGained > 0)) {
          await flushRemote(userId, working);
        }
      } catch {
        if (cancelled) return;
        syncEnabledRef.current = false;
        const d = structuredClone(normalizeGamificationState(local));
        const daily = awardDailyLogin(d);
        if (daily.xpGained > 0) saveState(userId, d);
        setState(d);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, flushRemote]);

  // Lifecycle-aware time tracking: count foreground deltas, flush on interval/visibility/pagehide.
  useEffect(() => {
    if (!state) return;

    if (!document.hidden) {
      visibleStartedAtRef.current = Date.now();
    }

    const commitPendingMinutes = () => {
      const elapsedMinutes = Math.floor(pendingMsRef.current / 60_000);
      if (elapsedMinutes <= 0) return;
      pendingMsRef.current -= elapsedMinutes * 60_000;
      const draft = structuredClone(state);
      const result = awardTimeSpent(draft, elapsedMinutes);
      if (result.xpGained > 0 || (result.newDeeds?.length ?? 0) > 0) {
        saveState(userId, draft);
        setState(draft);
        scheduleRemoteSave(userId, draft);
        persistTimeTracking(elapsedMinutes);
        void trackActivity(userId, "time_spent", {
          minutes: elapsedMinutes,
          xpGained: result.xpGained,
          totalMinutesSpent: draft.total_minutes_spent ?? 0,
        });
      }
      if ((result.newDeeds?.length ?? 0) > 0) {
        result.newDeeds.forEach((deed) => showDeedToast(deed));
      }
    };

    const captureVisibleDelta = () => {
      if (document.hidden) return;
      const now = Date.now();
      pendingMsRef.current += Math.max(0, now - visibleStartedAtRef.current);
      visibleStartedAtRef.current = now;
    };

    const onVisibility = () => {
      if (document.hidden) {
        captureVisibleDelta();
        commitPendingMinutes();
        return;
      }
      visibleStartedAtRef.current = Date.now();
    };

    const onPageHide = () => {
      captureVisibleDelta();
      commitPendingMinutes();
    };

    const id = setInterval(() => {
      captureVisibleDelta();
      // Keeps backward-compatible minute cadence if tab stays active for long periods.
      if (pendingMsRef.current < GAMIFICATION_MINUTE_TICK_MS) return;
      commitPendingMinutes();
    }, GAMIFICATION_MINUTE_TICK_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [state, userId, scheduleRemoteSave]);

  const award = useCallback(
    (actionKey, metadata = {}) => {
      if (!state) return;

      const draft = structuredClone(state);
      const result = awardXP(draft, actionKey, metadata);
      saveState(userId, draft);
      setState(draft);
      scheduleRemoteSave(userId, draft);

      if (result.xpGained > 0 && actionKey !== "presence_milestone") {
        showXPToast(result.xpGained, actionKey);
      }
      void trackActivity(userId, actionKey, {
        xpGained: result.xpGained,
        totalXp: draft.xp,
        metadata,
      });

      if (result.leveledUp && result.newLevel) {
        showLevelUpToast(result.newLevel);
      }

      if (result.newBadges?.length > 0) {
        result.newBadges.forEach((badge) => badge && showBadgeToast(badge));
      }
    },
    [state, userId, scheduleRemoteSave, trackActivity],
  );

  return { state, award, getLevelInfo: () => (state ? getLevelInfo(state.xp) : getLevelInfo(0)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast helpers
// ─────────────────────────────────────────────────────────────────────────────

function showXPToast(xp, actionKey) {
  toast(`+${xp} XP`, {
    description: `Keep going! Every verse counts.`,
    duration: 2000,
    style: {
      background: "oklch(0.18 0.06 155)",
      border: "1px solid oklch(0.68 0.13 155 / 40%)",
      color: "oklch(0.9 0.08 155)",
    },
    icon: "⚡",
  });
}

function showBadgeToast(badge) {
  toast(`Badge unlocked: ${badge.title}`, {
    description: badge.desc,
    duration: 4000,
    style: {
      background: "oklch(0.18 0.06 75)",
      border: "1px solid oklch(0.72 0.13 75 / 50%)",
      color: "oklch(0.95 0.06 75)",
    },
    icon: badge.icon,
  });
}

function showLevelUpToast(level) {
  toast(`Level Up! You're now a ${level.title}`, {
    description: `${level.titleAr} — Keep building your connection with the Quran.`,
    duration: 5000,
    style: {
      background: "oklch(0.18 0.08 75)",
      border: "2px solid oklch(0.72 0.13 75 / 70%)",
      color: "oklch(0.95 0.08 75)",
    },
    icon: "🎉",
  });
}

function showDeedToast(deed) {
  toast(`Deed earned: ${deed.title}`, {
    description: deed.desc,
    duration: 4500,
    style: {
      background: "oklch(0.18 0.08 95)",
      border: "1px solid oklch(0.75 0.12 95 / 60%)",
      color: "oklch(0.96 0.04 95)",
    },
    icon: deed.icon,
  });
}
