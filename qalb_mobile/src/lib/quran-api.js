/**
 * Quran content via the deployed Next.js API only — no OAuth client credentials on device.
 *
 * See /api/quran/chapters, /api/verse/by-chapter, /api/verse/by-key, /api/verse/audio, /api/verse/tafsir, /api/verse/by-page.
 */
import { CONFIG, isVercelConfigured } from "../config";

function baseUrl() {
  return CONFIG.API_BASE_URL.replace(/\/$/, "");
}

async function getJson(path, init) {
  if (!isVercelConfigured()) {
    throw new Error("Configure EXPO_PUBLIC_API_BASE_URL for Quran content");
  }
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Quran API proxy error [${res.status}] ${path}: ${res.statusText}`);
  }
  return res.json();
}

/** @deprecated Use QuranRepository only; token manager was for direct Foundation OAuth (removed from mobile). */
export class QuranTokenManager {
  static getInstance() {
    return QuranTokenManager;
  }

  async getToken() {
    throw new Error("QuranTokenManager is not used on mobile — use Next API routes");
  }
}

/** @deprecated Direct Foundation requests removed from mobile. */
export class RequestBuilder {
  constructor() {
    throw new Error("RequestBuilder is not used on mobile — use QuranRepository");
  }
}

export class QuranRepository {
  static async getChapters(language = "en") {
    return getJson(`/api/quran/chapters?language=${encodeURIComponent(language)}`);
  }

  static async getChapter(chapterId, language = "en") {
    const id = String(chapterId).includes(":") ? String(chapterId).split(":")[0] : String(chapterId);
    return getJson(`/api/quran/chapters/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}`);
  }

  static async getVersesByChapter(chapterId, opts = {}) {
    const { translationId = CONFIG.DEFAULT_TRANSLATION_ID, perPage = CONFIG.VERSES_PER_PAGE, page = 1 } = opts;
    const q = new URLSearchParams({
      surah: String(chapterId),
      page: String(page),
      perPage: String(perPage),
      translation: String(translationId),
    });
    return getJson(`/api/verse/by-chapter?${q}`);
  }

  static async getVerseByKey(verseKey, opts = {}) {
    const { translationId = CONFIG.DEFAULT_TRANSLATION_ID } = opts;
    const q = new URLSearchParams({
      key: verseKey,
      translation: String(translationId),
    });
    return getJson(`/api/verse/by-key?${q}`);
  }

  static async searchVerses(query, opts = {}) {
    const { size = 15, page = 0 } = opts;
    const q = new URLSearchParams({
      q: query,
      size: String(size),
      page: String(page),
    });
    return getJson(`/api/search?${q}`);
  }

  /**
   * Proxies /api/verse/audio — returns { audioUrl, verseKey, reciter, segments? } (not raw Foundation shape).
   */
  static async getVerseAudio(verseKey, recitationId = CONFIG.DEFAULT_RECITER_ID) {
    const q = new URLSearchParams({
      key: verseKey,
      reciter: String(recitationId),
    });
    return getJson(`/api/verse/audio?${q}`);
  }

  static async getTafsirByVerse(verseKey, tafsirId = CONFIG.DEFAULT_TAFSIR_ID) {
    const q = new URLSearchParams({
      key: verseKey,
      tafsirId: String(tafsirId),
    });
    return getJson(`/api/verse/tafsir?${q}`);
  }

  static async getVersesByPageFromApp(page, translationId = CONFIG.DEFAULT_TRANSLATION_ID) {
    const q = new URLSearchParams({
      page: String(page),
      translation: String(translationId),
    });
    return getJson(`/api/verse/by-page?${q}`);
  }
}
