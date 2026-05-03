-- Gamification JSON per Quran Foundation / NextAuth user id (sub).
-- All reads/writes go through Next.js API routes using the service role key.
--
-- RLS: optional. If you only ever use @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY
-- on the server, you can leave RLS disabled for this table. If you enable RLS for other
-- tables, add a policy here only if you introduce a direct browser Supabase client.

create table if not exists public.user_gamification (
  user_id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists user_gamification_updated_at_idx
  on public.user_gamification (updated_at desc);

comment on table public.user_gamification is 'Per-user gamification blob for Qalb (XP, badges, deeds, logs)';
