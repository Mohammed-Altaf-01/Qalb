/**
 * Initial sync merge: server row vs localStorage for a logged-in user.
 *
 * @see https://api-docs.quran.foundation/ (auth identity is session.user.id)
 */
import { createDefaultGamificationState, normalizeGamificationState } from "@/lib/gamification";

/** True if local state looks like more than a fresh default (worth promoting to server). */
export function hasPromotableLocalProgress(local) {
  if (!local || typeof local !== "object") return false;
  if ((local.xp ?? 0) > 0) return true;
  if ((local.badges?.length ?? 0) > 0) return true;
  if ((local.deeds?.length ?? 0) > 0) return true;
  if ((local.total_minutes_spent ?? 0) > 0) return true;
  if ((local.discovers_count ?? 0) > 0) return true;
  if ((local.reflections_count ?? 0) > 0) return true;
  if ((local.notes_count ?? 0) > 0) return true;
  if ((local.actionLog?.length ?? 0) > 0) return true;
  if ((local.surahs_read?.length ?? 0) > 0) return true;
  return false;
}

/**
 * @param {{ remoteState: object | null, localState: object }} args
 * @returns {{ nextState: object, promoteToServer: boolean }}
 */
export function mergeInitialGamificationSync({ remoteState, localState }) {
  const local = normalizeGamificationState(localState ?? createDefaultGamificationState());

  if (remoteState == null) {
    const promote = hasPromotableLocalProgress(local);
    return { nextState: local, promoteToServer: promote };
  }

  return {
    nextState: normalizeGamificationState(remoteState),
    promoteToServer: false,
  };
}
