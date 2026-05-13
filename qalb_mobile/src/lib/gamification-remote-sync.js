/**
 * Cloud gamification merge (same rules as web lib/gamification-merge.js) for mobile storage shape.
 */
import { defaultGamificationState, normalizeGamificationState } from "./gamification";

function hasPromotableLocalProgress(local) {
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
export function mergeInitialGamificationSyncMobile({ remoteState, localState }) {
  const local = normalizeGamificationState(localState ?? defaultGamificationState());

  if (remoteState == null) {
    return { nextState: local, promoteToServer: hasPromotableLocalProgress(local) };
  }

  return {
    nextState: normalizeGamificationState(remoteState),
    promoteToServer: false,
  };
}
