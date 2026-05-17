-- listen_history: per-user last listened surahs (reciter + position) for /listen resume.

alter table public.app_user_storage drop constraint if exists app_user_storage_namespace_check;

alter table public.app_user_storage add constraint app_user_storage_namespace_check check (
  namespace in (
    'reading_progress',
    'reading_history',
    'library_bookmarks',
    'library_collections',
    'verse_notes',
    'verse_reflections',
    'verse_chat',
    'goals_local',
    'preferences',
    'read_key_themes',
    'khatm_cycles',
    'hifz_progress',
    'prayer_log',
    'daily_letters',
    'listen_history'
  )
);
