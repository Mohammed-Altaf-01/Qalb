# Qalb — layered architecture

## Layers

1. **UI** — `app/**`, `components/**`: render-only + local interaction state.
2. **Client hooks / bridges** — `lib/useGamification.js`, `lib/user-app-sync-bridge.js`: session-aware orchestration around browser storage & server sync.
3. **Domain utilities** — `lib/*.js` pure helpers (`goal-progress.js`, `spaced-repetition.js`, merges, calendar keys). Covered by Vitest.
4. **Adapters** — `lib/quran-api.js`, `lib/user-api.js`, `lib/claude.js`: external HTTP/SDKs and OAuth/token concerns (server-safe).
5. **API routes** — `app/api/**/route.js`: validate inputs, delegate to adapters/libs, structured errors + `withLoggedRoute` logging.

Namespaces for Supabase-backed user blobs are centralized via `lib/constants/app-user-storage.js` and mirrored in mobile `qalb_mobile/src/lib/user-app-sync.js`.

## Mobile parity

Expo consumes the Next deployment (`CONFIG.API_BASE_URL`). AsyncStorage keys mirror web `qalb_*`; gamification persists per JWT `sub`: `qalb_gamification_<userId|guest>` with legacy migrate from plain `qalb_gamification`.
