# Mobile OAuth, JWT, and Supabase sync — security checklist

## Architecture

- The Expo app **never** embeds Supabase service role keys, `NEXTAUTH_SECRET`, or Quran Foundation **server** client secrets for Next-only routes.
- **Quran content on mobile** is fetched only through your Next.js deployment (`EXPO_PUBLIC_API_BASE_URL` + `/api/quran/*`, `/api/verse/*`, etc.); no Content API OAuth client secret is shipped in the Expo bundle.
- **Cloud `app_user_storage`** is read/written only through Next.js [`app/api/user/app-storage/[namespace]/route.js`](app/api/user/app-storage/[namespace]/route.js), which uses the server Supabase client.

## Mobile session JWT (Option B)

- [`lib/mobile-jwt.js`](lib/mobile-jwt.js) signs short-lived HS256 JWTs (`typ: qalb_mobile`, `sub: <NextAuth user id>`) after a successful browser sign-in at [`app/api/mobile/auth-complete/route.js`](app/api/mobile/auth-complete/route.js).
- Signing secret: `MOBILE_SESSION_JWT_SECRET` (preferred) or fallback to `NEXTAUTH_SECRET` / `AUTH_SECRET`. Use a **long random** secret in production.
- The app stores the JWT in **Expo SecureStore** and sends `Authorization: Bearer <jwt>` on `/api/user/app-storage/*` calls.
- **Threat model**: bearer theft grants access until expiry — use HTTPS only, short-ish TTL (e.g. 30d configurable), clear on sign-out, consider refresh rotation in a later iteration.

## RLS and Postgres

- Server routes use the **service role** path in [`lib/supabase-app-user-repository.js`](lib/supabase-app-user-repository.js) (or equivalent); RLS on `app_user_storage` may be bypassed for that role — confirm [supabase/migrations](supabase/migrations) match your intended isolation (per-user rows keyed by NextAuth `user.id`).
- If you later add **direct** Supabase access from the client, you **must** switch to user-scoped keys and `auth.uid()`-based RLS; that is not part of the current parity design.

## Review gate (before production)

1. Confirm no secrets in git for production builds (use EAS secrets / env).
2. Rate-limit or monitor `/api/mobile/auth-complete` if abuse is a concern.
3. Validate PATCH payload sizes server-side (already enforced via [`lib/app-user-storage.js`](lib/app-user-storage.js)).
