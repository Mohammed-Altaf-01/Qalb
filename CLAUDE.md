# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npx vercel --prod     # Deploy
```

### Mobile app (qalb_mobile/)
```bash
cd qalb_mobile
npm install
npx expo start        # Dev server (scan QR with Expo Go)
npx expo start --lan  # currently using this for testing the mobile app
```

**Before running mobile locally:** set `CONFIG.API_BASE_URL` in `qalb_mobile/src/config.js` to your machine's LAN IP (e.g. `http://192.168.1.42:3000`) — `localhost` won't reach the host machine from a physical device. For production, point it at the Vercel URL.

### Test API routes locally
```bash
curl http://localhost:3000/api/verse/daily
curl "http://localhost:3000/api/verse/by-key?key=2:255"
curl "http://localhost:3000/api/verse/by-key?key=2:255&translation=85"
curl "http://localhost:3000/api/verse/tafsir?key=2:255&tafsirId=168"
curl "http://localhost:3000/api/verse/audio?key=2:255&reciter=3"
curl "http://localhost:3000/api/search?q=patience"
curl -X POST http://localhost:3000/api/ai/discover \
  -H "Content-Type: application/json" \
  -d '{"situation":"I am feeling anxious about the future"}'
```

---

## Environment Variables (`.env.local`)

```env
QURAN_CLIENT_ID=406125ee-35af-4e0b-a6a8-052a21ae5f7e
QURAN_CLIENT_SECRET=5ZiLfXC4QXKhm7j8yIneYt91Ea
QURAN_OAUTH_ENDPOINT=https://oauth2.quran.foundation
QURAN_API_BASE=https://apis.quran.foundation
ANTHROPIC_API_KEY=sk-ant-...
NEXTAUTH_SECRET=qalb-secret-change-in-prod
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` is used by `app/verse/[verseKey]/page.js` to call its own API from a Server Component — must be updated to the Vercel URL after deploy.

---

## Architecture

### Server / Client split
Pages follow a shell + client pattern:
- **Server shell** (`page.js`) — fetches initial data (chapter list, verse, tafsir), passes as props; benefits from Next.js data cache.
- **Client layer** (`*Client.js`) — all interactivity, localStorage reads/writes, streaming AI, audio playback.

`app/verse/[verseKey]/page.js` → `VerseDetailClient.js` is the most complex example: server pre-fetches verse + tafsir + chapter, client handles 4 tabs + all state.

### lib/ — pure business logic, no Next.js dependencies
All lib files are framework-agnostic and fully tested:

| File | Pattern | Responsibility |
|---|---|---|
| `lib/quran-api.js` | Singleton + Repository + Builder | OAuth2 token management + all Content API calls |
| `lib/user-api.js` | Repository + Null Object | User API calls; returns `null`/empty arrays on 404 (never throws) |
| `lib/claude.js` | Facade | Wraps Anthropic SDK; exposes `discoverVerses()` and `generateReflectionPrompts()` |
| `lib/prompts.js` | Template | Single source of truth for all Claude prompts |
| `lib/utils.js` | — | Shadcn `cn()` utility only |

`QuranTokenManager` is a Singleton — one shared OAuth2 token across all requests. `RequestBuilder` is a fluent builder: `.withParam().withCache().fetch()`. Never instantiate them directly — use `QuranRepository` static methods.

### API routes (`app/api/`)
Thin proxy layer — they call `lib/` and stream responses. All AI routes (`/api/ai/*`) use `ReadableStream` for streaming. The `claude.js` lib is only used by AI routes, never by page Server Components directly.

**AI discover flow** (the main AI feature):
1. `/api/ai/discover` extracts keywords → calls Quran Foundation Search API for 15 candidate verses
2. Sends candidates as context to Claude (`claude-sonnet-4-6`) via non-streaming message
3. Claude selects 3 verse keys + writes explanations → returns JSON
4. Client calls `/api/verse/by-key` for each key to get full verse data

### Streaming pattern
All streaming routes write raw text chunks to a `ReadableStream`. Client components consume via `response.body.getReader()` + `TextDecoder`. See `app/api/ai/chat/route.js` for the canonical pattern.

### localStorage (client-side persistence, no auth required)
| Key | Shape |
|---|---|
| `qalb_bookmarks` | `{ [verseKey]: { verseKey, savedAt, ... } }` |
| `qalb_reflections` | `{ [verseKey]: string[] }` |
| `qalb_notes` | `{ [verseKey]: { text, savedAt } }` |
| `qalb_chat` | `{ [verseKey]: Message[] }` |
| `qalb_reciter_id` | `number` |
| `qalb_reading_progress` | `{ chapterId, page, translationId, cumulativeSummary }` |

---

## Design System

**Theme:** deep forest-green (`oklch(0.11 0.025 155)`) background, emerald primary (`oklch(0.68 0.13 155)`), warm gold accent (`oklch(0.72 0.13 75)`). All tokens live in `app/globals.css` as CSS variables consumed by Tailwind v4.

**Arabic text:** Amiri font (Google Fonts). Use class `arabic-text` — sets `font-family: Amiri`, `direction: rtl`, `line-height: 2`.

**Key CSS classes in `globals.css`:**
- `.tafsir-content` — styles raw tafsir HTML (gold `h2`, muted body)
- `.chat-markdown` — scoped markdown styles for AI chat bubbles
- `.animate-shimmer` — skeleton loading
- `.animate-fade-in-up` — verse card entrance
- `@keyframes blink` — cursor for the translation typing animation

**Translation typing animation** (`VerseDetailClient.js`): types at 2 chars/20ms with a blinking accent cursor. Triggers on translation load or language switch.

---

## Verified API IDs

### Reciters (AudioPlayer + `/api/verse/audio`)
`7` Mishari Alafasy (default) · `3` Al-Sudais · `2` AbdulBaset Murattal · `1` AbdulBaset Mujawwad · `6` Al-Husary · `10` Saud Al-Shuraym

Audio fallback chain: tries `[7, 2, 1]` before showing "unavailable".

### Translations (TRANSLATIONS array in `app/read/ReadClient.js`)
`20` Saheeh International (EN, default) · `19` Maarif-ul-Quran (EN) · `22` The Clear Quran (EN) · `84` Ibn Kathir abr. (EN) · `97` Yusuf Ali (EN) · `85` Mufti Taqi Usmani (UR) · `234` Dr. Farhat Hashmi (UR) · `162` Turkish Diyanet · `31` French Hamidullah · `54` Indonesian Kemenag · `203` Sahih Int. Malay · `52` Russian Kuliev

### Tafsirs (TAFSIRS array in `VerseDetailClient.js`)
`169` Ibn Kathir abr. (EN, default) · `168` Ma'arif al-Qur'an (EN) · `817` Tazkirul Quran (EN) · `160` Ibn Kathir (UR) · `159` Bayan ul Quran (UR) · `157` Fi Zilal al-Quran (UR) · `14` Ibn Kathir (AR) · `91` Al-Sa'di (AR)

---

## Quran Foundation Auth

OAuth2 Client Credentials flow — server-side only (`lib/quran-api.js`). Token auto-refreshes with 60s buffer.

```
Production:  Client ID 406125ee-35af-4e0b-a6a8-052a21ae5f7e  /  OAuth https://oauth2.quran.foundation
Pre-prod:    Client ID 68eb8691-d36b-4478-9f56-2ab1e490d2b3  /  OAuth https://prelive-oauth2.quran.foundation
```

Token lifetime: 3600s. No refresh token — request a new one when expired.

---

## Mobile App Architecture (`qalb_mobile/`)

React Native + Expo 54 app. No separate backend — it proxies all AI and verse API calls through the deployed Next.js web app.

### Navigation
`RootStack` (stack) wraps a `Tab.Navigator` (5 tabs). `VerseDetailScreen` lives on the root stack so it slides over any tab without disrupting tab state.

```
AppNavigator (RootStack)
├── Main → TabNavigator
│   ├── Home, Discover, Read, Library, Goals
└── VerseDetail  ← pushed from Read or Discover
```

### src/lib/ — mirrors web lib/
| File | Responsibility |
|---|---|
| `quran-api.js` | Direct Quran Foundation API calls (OAuth2 token managed client-side here, unlike server-side web) |
| `claude.js` | Calls web app's `/api/ai/*` routes — Anthropic key never stored in mobile |
| `prompts.js` | Shared prompt templates (kept in sync with web `lib/prompts.js`) |
| `storage.js` | AsyncStorage wrapper; same key names as web localStorage (`qalb_bookmarks`, etc.) |

### Key design decisions
- **No Anthropic key in mobile** — all Claude calls go through `CONFIG.API_BASE_URL` (the Vercel deployment). `isVercelConfigured()` in `config.js` gates AI features.
- **Theme** — `src/theme.js` exports `COLORS`, `SPACING`, `FONT_SIZE`, `BORDER_RADIUS` as plain JS objects (no Tailwind). Tokens are hex conversions of the web's oklch values.
- **AsyncStorage keys** match web localStorage keys exactly, enabling future cross-platform sync.

---

## Known Issues

1. **`NEXT_PUBLIC_APP_URL` must be set** — `app/verse/[verseKey]/page.js` calls `${NEXT_PUBLIC_APP_URL}/api/verse/by-key` from a Server Component. If unset or wrong, translation arrives empty; `VerseDetailClient` has a `useEffect` fallback fetch to recover.

2. **User API auth not implemented** — `/api/user/*` routes require a user-scoped Bearer token (PKCE flow). Until login is added, all user features fall back gracefully to localStorage.

3. **MCP removed** — `client.beta.messages.create` with MCP was removed because the pre-production server returns "Resource not found" for all tool calls. Discover now grounds Claude with Search API candidates instead.

4. **Vitest + JSX in `.js` files** — `vitest.config.js` includes a custom `jsxInJsPlugin` that pre-transforms `.js` files with Babel before Vite's OXC handles them. Required because Vite 6 OXC doesn't parse JSX in `.js` extensions.
