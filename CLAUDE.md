---
description: 
alwaysApply: true
---

# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Rules

- **After every code change to the web app, run `npm test` and confirm all tests pass before reporting the task as done.**
- When adding new logic (pure functions, data transforms, utilities), add corresponding tests in `lib/__tests__/`.
- `CLAUDE.md` and `**/CLAUDE.md` are in `.gitignore` — never commit them.

---

## Commands

### Web app (repo root)

```bash
npm run dev           # Next.js dev server at http://localhost:3000
npm run build         # Production build (catches type/import errors)
npm test              # Run all Vitest tests once
npm run test:watch    # Watch mode
npx vitest run lib/__tests__/prompts.test.js   # Single test file
npm run format        # Prettier + import sort (write)
npm run format:check  # Check only (CI)
npx vercel --prod    # Deploy
```

### Mobile app (`qalb_mobile/`)

```bash
cd qalb_mobile
npm install
npx expo start        # Dev server (scan QR with Expo Go)
npx expo start --lan  # LAN — common for physical device testing
```

**Mobile:** set `CONFIG.API_BASE_URL` in `qalb_mobile/src/config.js` to the machine LAN IP (e.g. `http://192.168.1.42:3000`). `localhost` does not work from a phone. Production: Vercel URL.

### Test API routes locally

```bash
curl http://localhost:3000/api/verse/daily
curl "http://localhost:3000/api/verse/by-key?key=2:255"
curl "http://localhost:3000/api/verse/by-key?key=2:255&translation=85"
curl "http://localhost:3000/api/verse/by-page?page=1&translation=20"
curl "http://localhost:3000/api/verse/tafsir?key=2:255&tafsirId=168"
curl "http://localhost:3000/api/verse/audio?key=2:255&reciter=3"
curl "http://localhost:3000/api/search?q=patience"
curl "http://localhost:3000/api/audio/radios?language=eng"
curl "http://localhost:3000/api/live/tv?language=eng"
curl -X POST http://localhost:3000/api/ai/discover \
  -H "Content-Type: application/json" \
  -d '{"situation":"I am feeling anxious about the future"}'
```

---

## Environment Variables (`.env.local`)

```env
QURAN_CLIENT_ID=...
QURAN_CLIENT_SECRET=...
QURAN_OAUTH_ENDPOINT=https://oauth2.quran.foundation
QURAN_API_BASE=https://apis.quran.foundation
ANTHROPIC_API_KEY=sk-ant-...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**`NEXT_PUBLIC_APP_URL`** is used by:

- `app/verse/[verseKey]/page.js` — Server Component fetch to `/api/verse/by-key`
- `app/live/page.js` — server fetch to `${NEXT_PUBLIC_APP_URL}/api/live/tv` at build/ISR time

Set to the deployed Vercel URL in production.

---

## Architecture

### Server / Client split

- **Server shell** (`page.js`) — initial data (chapters, verse, tafsir, live channel list), Next.js cache where applicable.
- **Client** (`*Client.js`) — interactivity, `localStorage`, streaming AI, HLS video, global audio.

Examples: `app/verse/[verseKey]/page.js` → `VerseDetailClient.js`; `app/read/page.js` → `ReadClient.js`; `app/live/page.js` → `LiveClient.js`.

### UI components (shadcn / Base UI)

- **`components/ui/button.jsx`** — Base UI `ButtonPrimitive`. It does **not** support Radix-style `asChild`. Use `<Link href="..."><Button>...</Button></Link>` instead of `Button asChild`.

### `lib/` — framework-agnostic logic (tested)

| File | Responsibility |
|------|----------------|
| `lib/quran-api.js` | OAuth2 + `QuranRepository` (chapters, verses by chapter, **by page**, by key, audio, reciters list, tafsir, search, etc.) |
| `lib/user-api.js` | User API; null/empty on 404 |
| `lib/claude.js` | Anthropic facade for AI routes |
| `lib/prompts.js` | Claude prompt templates |
| `lib/arabic-utils.js` | Verse markers, word filter, Arabic-Indic digits |
| `lib/translation-utils.js` | `cleanTranslationText` — strip inline footnote digits from translation HTML text |
| `lib/read-reciters.js` | Small list of reciter IDs supported by `/api/verse/audio` (verse-level recitation) |
| `lib/read-pagination.js` | Pagination helpers for chapter verse batches |
| `lib/qalb-journey-events.js` | `qalb_journey_local_updated` for same-tab history refresh |
| `lib/qalb-discover-history.js` | Discover history localStorage + append helper |
| `lib/quran-audio-player.js` | Global client audio: **listen** (full surah MP3), **radio** (stream URL); subscribers + mini-player |
| `lib/gamification.js` / `lib/useGamification.js` | XP, badges, toasts |

`QuranTokenManager` is a singleton; use `QuranRepository` static methods, not raw `RequestBuilder` in app code.

### API routes (`app/api/`)

Thin proxies. AI routes stream via `ReadableStream`.

**Quran Foundation (authenticated server-side)**

| Route | Purpose |
|-------|---------|
| `/api/verse/by-chapter` | Paginated verses per surah + translation |
| `/api/verse/by-page` | **Mushaf page** verses (page 1–604) |
| `/api/verse/by-key` | Single verse (+ tafsir/chapter where available) |
| `/api/verse/audio` | Verse audio URL + optional segments |
| `/api/verse/tafsir` | Tafsir by verse |
| `/api/search` | Search proxy |
| `/api/verse/daily` | Daily verse |

**MP3 Quran (public HTTP — proxied from app)**

| Route | Upstream |
|-------|----------|
| `/api/audio/radios` | `https://www.mp3quran.net/api/v3/radios` |
| `/api/audio/reciters` | `https://www.mp3quran.net/api/v3/reciters` |
| `/api/live/tv` | `https://www.mp3quran.net/api/v3/live-tv` |

**User / AI** — unchanged pattern: `/api/user/*`, `/api/ai/*`.

### Reading experience (`app/read/`)

- **Verses** — Infinite scroll batches; per-verse Arabic (word spans + segment highlighting when segments available), translation (`cleanTranslationText`), bookmark (`qalb_bookmarks`), verse audio via `/api/verse/audio`.
- **Mushaf** — Quran **page numbers 1–604** via `/api/verse/by-page`; previous/next page; continuous Arabic layout + ayah badges (see `app/globals.css`).

### Listen / Radio / Live

- **`/listen`** — Reciters from mp3quran (A–Z). Selecting reciter filters surahs by that reciter’s `surah_list`; play uses `{server}{001-114}.mp3`. Global player: `lib/quran-audio-player.js`; leaving the page shows `ListenMiniPlayer` (bottom bar).
- **Header radio** (`RadioQuranButton`) — Random station from `/api/audio/radios`; play/pause on same control; uses `startExternalQuranAudio` stream URL (not verse-by-verse).
- **`/live`** — HLS live TV (`hls.js` + `<video>`); channels from `/api/live/tv`; default prefers “Quran” (Makkah-style) channel.

### Journey / Profile history

- **`/journey`** — `UserJourneyHistory`: key themes (`qalb_read_key_themes`), discover history, reflections, verse chat; listens for `qalb_journey_local_updated`.
- Profile tab **Journey** shows the same component.
- **`lib/auth.js`** / NextAuth Quran Foundation provider — scopes as configured in repo.

### Navigation (`components/Navigation.js`)

Desktop + mobile tabs include: Home, Read, Ahadith, Discover, Journey, Listen, Live (plus Profile / Settings in header). **`navIsActive`** uses exact match for `/journey`, `/listen`, `/live` so nested paths do not falsely highlight.

### Gamification / nudges

- **`components/PresenceMilestones.js`** — 5m / 20m / hourly “time with Quran” dialogs + `presence_milestone` XP (toast suppressed for that action in `useGamification`).
- **`components/AppDayStamp.js`**, **`SessionActivityPing.js`** — activity / heatmap adjacency data.

---

## Design System

**Theme:** deep forest-green background, emerald primary, warm gold accent — tokens in `app/globals.css` (Tailwind v4).

**Arabic (Read / mushaf):** Naskh-first stack (`Noto Naskh Arabic`, `Amiri`, …). Prefer `.read-quran-arabic`, `.read-quran-arabic--mushaf`, `.ayah-end-badge` where used. Legacy `.arabic-text` remains for other screens.

**Markdown / prose:** `.tafsir-content`, `.chat-markdown`, `.reading-prose`, skeletons (`.animate-shimmer`), `.animate-fade-in-up`.

**Verse detail:** Translation typing animation in `VerseDetailClient` — 2 chars / 20ms + cursor; translations passed through `cleanTranslationText` where applied.

---

## Verified API IDs (Quran Foundation)

### Reciters (`/api/verse/audio`)

`7` Mishari Alafasy (default fallback chain anchor) · `3` Al-Sudais · `2` AbdulBaset Murattal · `1` AbdulBaset Mujawwad · `6` Al-Husary · `10` Saud Al-Shuraym`

Fallback order in route tries user pick then `[7, 2, 1, 3, 6, 10]`.

### Translations (`TRANSLATIONS` in `app/read/ReadClient.js`)

`20` Saheeh International · `85` M.A.S. Abdel Haleem · `19` Pickthall · `22` Yusuf Ali · `84` Mufti Taqi Usmani · `54` Junagarhi (UR) · `234` Jalandhari (UR) · `97` Maududi (UR) · `162` Bayaan (BN) · `31` Hamidullah (FR) · `52` Yazır (TR) · `33` Indonesian Ministry

### Tafsirs (`VerseDetailClient.js`)

`169` Ibn Kathir abr. (EN, default) · `168` Ma'arif al-Qur'an · `817` Tazkirul Quran · `160`/`159`/`157` Urdu set · `14`/`91` Arabic

---

## Quran Foundation Auth

OAuth2 Client Credentials — server-only in `lib/quran-api.js`. Token refresh with buffer; no refresh token.

Pre-prod vs production client IDs live in project docs / env; do not hardcode secrets in source.

---

## Mobile (`qalb_mobile/`)

Expo app proxies AI and verse APIs through the Next deployment. `storage.js` keys align with web `localStorage` names. No Anthropic key on device.

---

## localStorage (web)

| Key | Purpose |
|-----|---------|
| `qalb_bookmarks` | Verse bookmarks (Read + verse page) |
| `qalb_reflections` | Reflection prompts per verse |
| `qalb_notes` | Notes per verse |
| `qalb_chat` | Verse chat threads |
| `qalb_reciter_id` | Read reciter preference |
| `qalb_reading_progress` | Reading position |
| `qalb_read_key_themes` | AI key themes per surah (sync namespace `read_key_themes`) |
| `qalb_discover_history` | Recent discover queries |
| `qalb_app_active_day` / heatmap-related keys | Activity UI |

---

## Known issues / caveats

1. **`NEXT_PUBLIC_APP_URL`** must be correct for server-side fetches (verse page, live TV list in some build paths).

2. **Quran Foundation Content API** may return **403** for some resources in certain environments (e.g. daily verse key, `resources/recitations`). The app falls back: **Listen** uses **mp3quran** reciters; verse audio still uses Foundation `/api/verse/audio` with the supported ID set.

3. **User API** — full user-scoped flows may still be partial; many features use `localStorage` + optional Supabase `app_user_storage` sync.

4. **Discover** — grounded via Search API + Claude, not MCP (MCP removed for reliability on some API tiers).

5. **Vitest + JSX in `.js`** — `vitest.config.js` uses a Babel `jsxInJsPlugin` so Vite 6 OXC can run tests on JSX in `.js` files.

6. **Supabase** — if `read_key_themes` or other namespaces fail RLS/namespace checks, apply the migrations under `supabase/migrations/`.

---

## External references (product / APIs)

- [Quran Foundation Content API docs](https://api-docs.quran.foundation/docs/content_apis_versioned/content-apis)
- [MP3 Quran API](https://www.mp3quran.net/eng/api) — radios, reciters, live TV
- [Quran.com](https://quran.com/) — UX reference for reading modes
