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
  default: 200_000,
};

export const USER_ACTIVITY_MAX_METADATA_BYTES = 24_000;
