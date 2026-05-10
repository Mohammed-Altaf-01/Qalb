-- Extra app_user_storage namespaces + defense-in-depth RLS.
-- Server routes use the Supabase service role (bypasses RLS). Direct anon/authenticated JWT access stays denied.

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
    'daily_letters'
  )
);

alter table public.app_user_storage enable row level security;
alter table public.user_activity_events enable row level security;
alter table public.app_user_profiles enable row level security;
alter table public.user_gamification enable row level security;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null,
  p256dh text,
  auth text,
  timezone_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_len check (char_length(endpoint) < 8000)
);

create unique index if not exists push_subscriptions_user_endpoint_uidx
  on public.push_subscriptions (user_id, endpoint);

comment on table public.push_subscriptions is 'Web Push subscription rows; written only from authenticated API routes.';

alter table public.push_subscriptions enable row level security;
