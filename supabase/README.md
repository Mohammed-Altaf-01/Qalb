# Supabase schema (Qalb)

Apply migrations in order (SQL editor or Supabase CLI linked to this project):

1. `migrations/20260203120000_user_gamification.sql` — `user_gamification` (XP state)
2. `migrations/20260204100000_app_user_storage_schema.sql` — `app_user_profiles`, `app_user_storage`, `user_activity_events`, triggers

**API routes (Next.js, session cookie):**

- `GET|PATCH /api/user/gamification` — gamification JSON
- `GET|PATCH /api/user/app-storage/[namespace]` — namespaced blobs (`reading_progress`, `verse_chat`, …)
- `GET /api/user/profile` — `app_user_profiles`
- `POST /api/user/activity` — append `user_activity_events`

**MCP / RLS:** You can apply the same SQL with the Cursor Supabase MCP `apply_migration` tool (or the SQL editor). New tables often have **RLS enabled** in the dashboard; this app calls Postgres only with **`SUPABASE_SERVICE_ROLE_KEY`** from Next.js route handlers, which **bypasses RLS**—no anon key in the browser for these tables.

**Re-apply locally:** paste each file into the SQL editor or run `supabase db push` from a CLI-linked repo.
