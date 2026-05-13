/**
 * Central configuration for Qalb Mobile.
 *
 * API_BASE_URL — set `EXPO_PUBLIC_API_BASE_URL` in `qalb_mobile/.env` (see `.env.example`).
 * Restart the Expo dev server after changing env vars.
 *
 * Quran content and AI are proxied through your Next app — no Content API OAuth secrets on device.
 */

const PLACEHOLDER_API_BASE = "https://your-app.vercel.app";

function normalizeBaseUrl(url) {
  return String(url ?? "")
    .trim()
    .replace(/\/$/, "");
}

function readApiBaseUrlFromEnv() {
  try {
    const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
    return normalizeBaseUrl(raw);
  } catch {
    return "";
  }
}

export const CONFIG = {
  API_BASE_URL: readApiBaseUrlFromEnv() || PLACEHOLDER_API_BASE,

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
