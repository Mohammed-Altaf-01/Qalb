"use client";

/**
 * useGamification — React hook that wraps the gamification engine.
 *
 * Usage:
 *   const { state, award } = useGamification();
 *   award("bookmark_verse");           // award XP + show toast
 *   award("read_verse_page", { surahNumber: 2 });
 */
import { useCallback, useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { DEFAULT_TIME_SPENT_MINUTES_INCREMENT, GAMIFICATION_MINUTE_TICK_MS } from "@/lib/constants/gamification";

import { awardDailyLogin, awardTimeSpent, awardXP, getLevelInfo, loadState, saveState } from "./gamification";

export function useGamification() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "guest";

  const [state, setState] = useState(null);

  // Load state on mount / userId change
  useEffect(() => {
    const loaded = loadState(userId);
    setState(loaded);

    // Award daily login XP once per day
    const result = awardDailyLogin(loaded);
    if (result.xpGained > 0) {
      saveState(userId, loaded);
      setState({ ...loaded });
    }
  }, [userId]);

  // Passive time tracking: award 1 minute every 60s while tab is visible.
  useEffect(() => {
    if (!state) return;

    const id = setInterval(() => {
      if (document.hidden) return;
      const draft = structuredClone(state);
      const result = awardTimeSpent(draft, DEFAULT_TIME_SPENT_MINUTES_INCREMENT);
      if (result.xpGained > 0 || (result.newDeeds?.length ?? 0) > 0) {
        saveState(userId, draft);
        setState(draft);
      }
      if ((result.newDeeds?.length ?? 0) > 0) {
        result.newDeeds.forEach((deed) => showDeedToast(deed));
      }
    }, GAMIFICATION_MINUTE_TICK_MS);

    return () => clearInterval(id);
  }, [state, userId]);

  const award = useCallback(
    (actionKey, metadata = {}) => {
      if (!state) return;

      const draft = { ...state };
      const result = awardXP(draft, actionKey, metadata);
      saveState(userId, draft);
      setState(draft);

      if (result.xpGained > 0) {
        showXPToast(result.xpGained, actionKey);
      }

      if (result.leveledUp && result.newLevel) {
        showLevelUpToast(result.newLevel);
      }

      if (result.newBadges?.length > 0) {
        result.newBadges.forEach((badge) => badge && showBadgeToast(badge));
      }
    },
    [state, userId],
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
