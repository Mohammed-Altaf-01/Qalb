/** Single source for localStorage keys mirrored to Supabase `app_user_storage` when signed in. */

export const LS_READING_PROGRESS_KEY = "qalb_reading_progress";

export const LS_KHATM_PAGES_KEY = "qalb_khatm_pages_v1";

export const LS_HIFZ_PROGRESS_KEY = "qalb_hifz_progress_v1";

/** Surah-level Key Themes markdown cache; synced to `read_key_themes` namespace. */
export const LS_READ_KEY_THEMES = "qalb_read_key_themes";

/** Set to YYYY-MM-DD when the app is used; profile heatmap uses for “today” tint. */
export const LS_APP_ACTIVE_DAY = "qalb_app_active_day";

/** Signed-in daily session ping (matches SessionActivityPing). */
export const LS_LAST_SESSION_ACTIVITY_DAY = "qalb_last_session_activity_day";

/** Fired in-tab when `qalb_time_tracking` is updated (same-tab `storage` does not fire). */
export const QALB_TIME_TRACKING_UPDATED_EVENT = "qalb-time-tracking-updated";
