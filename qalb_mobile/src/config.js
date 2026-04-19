/**
 * Central configuration for Qalb Mobile.
 *
 * SETUP REQUIRED:
 *  1. Set API_BASE_URL to your deployed Vercel URL after deployment.
 *     For local dev on a physical device, use your machine's LAN IP:
 *     e.g. 'http://192.168.1.42:3000'  (not 'localhost' — that won't reach your machine)
 *
 *  2. The Quran Foundation credentials below are read-only content API keys.
 *     They are safe to bundle in the mobile app.
 *
 *  3. The Anthropic API key is NOT stored here — all Claude AI calls are
 *     proxied through your Vercel Next.js API routes which hold the secret key.
 */

export const CONFIG = {
  // ── Vercel deployment URL (used for all /api/ai/* and /api/verse/* calls) ──
  API_BASE_URL: 'https://your-app.vercel.app',

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

/** Returns true if the Vercel URL has been configured by the user */
export const isVercelConfigured = () =>
  CONFIG.API_BASE_URL !== 'https://your-app.vercel.app';
