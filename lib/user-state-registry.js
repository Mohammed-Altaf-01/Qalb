/**
 * Maps localStorage keys to Supabase `app_user_storage` namespaces.
 * Used for audits; push is triggered via explicit `schedulePush*` hooks.
 */

export const LS_GOALS = "qalb_goals_local";
export const LS_DISCOVER_HISTORY_KEY = "qalb_discover_history";
export const LS_DAILY_LETTER_DAY = "qalb_daily_letter_day";
export const LS_DAILY_LETTER_TEXT = "qalb_daily_letter_text";
export const LS_PRAYER_COORDS = "qalb_prayer_coords";
export const LS_LIVE_VIDEO_FIT = "qalb_live_video_fit";

/** Device-local only (not synced). */
export const DEVICE_LOCAL_KEYS = ["qalb_nudge_dismissed_session"];
