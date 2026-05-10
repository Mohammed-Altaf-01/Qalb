/**
 * Central configuration for Qalb Mobile.
 *
 * API_BASE_URL — set `EXPO_PUBLIC_API_BASE_URL` in `qalb_mobile/.env` (see `.env.example`).
 * Restart the Expo dev server after changing env vars.
 *
 * For local dev on a physical device, use your machine's LAN IP, e.g.
 *   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:3000
 * (`localhost` on the device refers to the phone, not your computer.)
 *
 * Quran Foundation credentials below are read-only content API keys (safe in the client).
 * Anthropic is not on device — AI goes through your Next `/api/ai/*` routes.
 */

const PLACEHOLDER_API_BASE = 'https://your-app.vercel.app';

function normalizeBaseUrl(url) {
  return String(url ?? '')
    .trim()
    .replace(/\/$/, '');
}

function readApiBaseUrlFromEnv() {
  try {
    const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
    return normalizeBaseUrl(raw);
  } catch {
    return '';
  }
}

export const CONFIG = {
  API_BASE_URL: readApiBaseUrlFromEnv() || PLACEHOLDER_API_BASE,

  // ── Quran Foundation — Production credentials ────────────────────────────
  QURAN_CLIENT_ID: '406125ee-35af-4e0b-a6a8-052a21ae5f7e',
  QURAN_CLIENT_SECRET: '5ZiLfXC4QXKhm7j8yIneYt91Ea',
  QURAN_OAUTH_URL: 'https://oauth2.quran.foundation',
  QURAN_API_BASE: 'https://apis.quran.foundation',

  // ── Defaults ─────────────────────────────────────────────────────────────
  DEFAULT_RECITER_ID: 7,
  DEFAULT_TRANSLATION_ID: 20,
  DEFAULT_TAFSIR_ID: 169,
  VERSES_PER_PAGE: 15,
};

/** True when a real http(s) base URL is configured (not the placeholder). */
export const isVercelConfigured = () => {
  const u = CONFIG.API_BASE_URL;
  if (!u || u === PLACEHOLDER_API_BASE) return false;
  return /^https?:\/\//i.test(u);
};
