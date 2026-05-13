# Web routes and mobile parity

This document maps the Next.js app to the Expo app (`qalb_mobile/`). Use it when adding features or reviewing gaps.

## Navigation parity

| Web route / area   | Web entry             | Mobile implementation                                         |
| ------------------ | --------------------- | ------------------------------------------------------------- |
| Home               | `/`                   | `HomeScreen` (tab)                                            |
| Read (verses)      | `/read`               | `ReadScreen` → surah list + `VerseReader`                     |
| Read (mushaf page) | `/read` layout mushaf | `ReadScreen` → `MushafPageReader`                             |
| Verse detail       | `/verse/[verseKey]`   | `VerseDetail` stack → `VerseDetailScreen`                     |
| Discover           | `/discover`           | `DiscoverScreen` (tab)                                        |
| Journey            | `/journey`            | `JourneyScreen` (tab)                                         |
| Library            | `/library`            | `LibraryScreen` (stack from Menu)                             |
| Goals              | `/goals`              | `GoalsScreen` (stack from Menu)                               |
| Settings           | `/settings`           | `SettingsScreen` (stack from Menu)                            |
| Profile            | `/profile`            | `ProfileScreen` (stack from Menu)                             |
| Listen             | `/listen`             | `ListenScreen` (stack from Menu)                              |
| Live               | `/live`               | `LiveScreen` (stack from Menu)                                |
| Ahadith            | `/ahadith/*`          | `AhadithBooks` → `AhadithChapters` → `AhadithSection` (stack) |
| Sign in            | `/auth/signin`        | In-app browser → `/api/mobile/auth-complete` → deep link      |

## API usage (mobile)

Configured via `qalb_mobile/src/config.js` → `CONFIG.API_BASE_URL` (deployed Next origin).

| Capability         | Endpoint                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Mushaf page verses | `GET /api/verse/by-page?page=&translation=`                                                            |
| Hadith catalog     | `GET /api/hadith/books`, `GET /api/hadith/chapters?book=`, `GET /api/hadith/section?edition=&section=` |
| Reciters (Listen)  | `GET /api/audio/reciters`                                                                              |
| Live TV list       | `GET /api/live/tv?language=eng`                                                                        |
| Radios             | `GET /api/audio/radios?language=eng`                                                                   |
| AI / verse proxies | Existing `qalb_mobile` `aiService` / `QuranRepository` patterns                                        |
| Cloud user storage | `GET/PATCH /api/user/app-storage/{namespace}` with `Authorization: Bearer` (mobile JWT)                |

## Storage keys (AsyncStorage)

Aligned with web `localStorage` / [lib/qalb-storage-keys.js](lib/qalb-storage-keys.js) and [qalb_mobile/src/lib/storage.js](qalb_mobile/src/lib/storage.js). Journey and sync listen for the same logical events via `DeviceEventEmitter` (`qalb-account-storage-synced`, `qalb_journey_local_updated`).

## OAuth / sync

See [MOBILE_SECURITY.md](MOBILE_SECURITY.md) for session transport and RLS notes.
