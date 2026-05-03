-- Extended Qalb user data in Supabase (identity = NextAuth session.user.id, i.e. Quran Foundation `sub`).
-- Access only via Next.js API routes + SUPABASE_SERVICE_ROLE_KEY (no browser Supabase client).
--
-- Layout:
--   public.user_gamification     — XP / badges / deeds (existing; /api/user/gamification)
--   public.app_user_storage      — namespaced JSON mirrors of local-first client state
--   public.app_user_profiles     — lightweight profile / last-seen (optional analytics)
--   public.user_activity_events  — optional append-only activity stream

-- ─── Profiles ───────────────────────────────────────────────────────────────

create table if not exists public.app_user_profiles (
  user_id text primary key,
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.app_user_profiles is 'One row per Qalb user; touch last_seen_at from API when user syncs';

create index if not exists app_user_profiles_last_seen_idx
  on public.app_user_profiles (last_seen_at desc);

-- ─── Namespaced JSON blobs (mirrors web localStorage keys conceptually) ─────

create table if not exists public.app_user_storage (
  user_id text not null,
  namespace text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, namespace),
  constraint app_user_storage_namespace_check check (
    namespace in (
      'reading_progress',
      'reading_history',
      'library_bookmarks',
      'library_collections',
      'verse_notes',
      'verse_reflections',
      'verse_chat',
      'goals_local',
      'preferences'
    )
  )
);

comment on table public.app_user_storage is 'Per-user JSON documents; namespace maps to Qalb client slices (see lib/constants/app-user-storage.js)';

create index if not exists app_user_storage_user_updated_idx
  on public.app_user_storage (user_id, updated_at desc);

-- ─── Optional activity log (small events; trim client-side or via cron) ───

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.user_activity_events is 'Append-only events for streaks/analytics; POST /api/user/activity';

create index if not exists user_activity_events_user_created_idx
  on public.user_activity_events (user_id, created_at desc);

-- ─── updated_at maintenance (Postgres 15+ trigger syntax) ───────────────────

create or replace function public.qalb_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_user_storage_touch_updated_at on public.app_user_storage;
create trigger app_user_storage_touch_updated_at
  before update on public.app_user_storage
  for each row
  execute function public.qalb_touch_updated_at();

-- user_gamification is created in an earlier migration; guard for partial applies.
do $mig$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'user_gamification'
  ) then
    drop trigger if exists user_gamification_touch_updated_at on public.user_gamification;
    create trigger user_gamification_touch_updated_at
      before update on public.user_gamification
      for each row
      execute function public.qalb_touch_updated_at();
  end if;
end
$mig$;
