/**
 * Namespaces for public.app_user_storage (see supabase/migrations).
 * Maps to familiar localStorage concepts on the web app.
 */
export const APP_USER_STORAGE_NAMESPACES = [
  "reading_progress",
  "reading_history",
  "library_bookmarks",
  "library_collections",
  "verse_notes",
  "verse_reflections",
  "verse_chat",
  "goals_local",
  "preferences",
  "read_key_themes",
  "khatm_cycles",
  "hifz_progress",
  "prayer_log",
  "daily_letters",
  "listen_history",
];

/** Max serialized JSON size per namespace (bytes) for PATCH bodies */
export const APP_USER_STORAGE_MAX_BYTES = {
  reading_progress: 32_000,
  reading_history: 128_000,
  library_bookmarks: 256_000,
  library_collections: 128_000,
  verse_notes: 256_000,
  verse_reflections: 256_000,
  verse_chat: 400_000,
  goals_local: 128_000,
  preferences: 16_000,
  read_key_themes: 512_000,
  khatm_cycles: 64_000,
  hifz_progress: 512_000,
  prayer_log: 64_000,
  daily_letters: 400_000,
  listen_history: 64_000,
  default: 200_000,
};

export const USER_ACTIVITY_MAX_METADATA_BYTES = 24_000;
