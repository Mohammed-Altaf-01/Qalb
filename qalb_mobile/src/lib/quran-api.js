/**
 * Quran Foundation Content API Client — React Native adaptation.
 *
 * Adapted from web app lib/quran-api.js:
 *  - Replaced Buffer.from().toString('base64') with btoa() (RN global)
 *  - Removed Next.js `next: { revalidate }` cache options from fetch
 *  - Reads credentials from src/config.js instead of process.env
 *
 * Patterns: Singleton (token), Repository (data access), Builder (requests)
 */

import { CONFIG } from '../config';

const { QURAN_CLIENT_ID, QURAN_CLIENT_SECRET, QURAN_OAUTH_URL, QURAN_API_BASE } = CONFIG;
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

// ── Singleton: Token Manager ───────────────────────────────────────────────────

class QuranTokenManager {
  static #instance = null;
  #accessToken = null;
  #expiresAt = 0;

  static getInstance() {
    if (!QuranTokenManager.#instance) {
      QuranTokenManager.#instance = new QuranTokenManager();
    }
    return QuranTokenManager.#instance;
  }

  async getToken() {
    if (this.#accessToken && Date.now() < this.#expiresAt) {
      return this.#accessToken;
    }
    return this.#fetchNewToken();
  }

  async #fetchNewToken() {
    const credentials = btoa(`${QURAN_CLIENT_ID}:${QURAN_CLIENT_SECRET}`);
    const res = await fetch(`${QURAN_OAUTH_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=content',
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    this.#accessToken = data.access_token;
    this.#expiresAt = Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    return this.#accessToken;
  }
}

// ── Builder: Request Builder ───────────────────────────────────────────────────

class RequestBuilder {
  constructor(path) {
    this.path = path;
    this.params = new URLSearchParams();
    this.tokenManager = QuranTokenManager.getInstance();
  }

  withParam(key, value) {
    if (value !== undefined && value !== null) {
      this.params.set(String(key), String(value));
    }
    return this;
  }

  async fetch() {
    const token = await this.tokenManager.getToken();
    const queryString = this.params.toString();
    const url = `${QURAN_API_BASE}${this.path}${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      headers: {
        'x-auth-token': token,
        'x-client-id': QURAN_CLIENT_ID,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Quran API error [${res.status}] ${this.path}: ${res.statusText}`);
    }

    return res.json();
  }
}

// ── Repository: Quran Repository ──────────────────────────────────────────────

class QuranRepository {
  static async getChapters(language = 'en') {
    return new RequestBuilder('/content/api/v4/chapters')
      .withParam('language', language)
      .fetch();
  }

  static async getChapter(chapterId, language = 'en') {
    return new RequestBuilder(`/content/api/v4/chapters/${chapterId}`)
      .withParam('language', language)
      .fetch();
  }

  static async getVersesByChapter(chapterId, opts = {}) {
    const {
      translationId = CONFIG.DEFAULT_TRANSLATION_ID,
      language = 'en',
      perPage = CONFIG.VERSES_PER_PAGE,
      page = 1,
    } = opts;
    return new RequestBuilder(`/content/api/v4/verses/by_chapter/${chapterId}`)
      .withParam('translations', translationId)
      .withParam('language', language)
      .withParam('per_page', perPage)
      .withParam('page', page)
      .withParam('fields', 'text_uthmani,chapter_id,verse_number,verse_key,juz_number')
      .withParam('audio', 7)
      .fetch();
  }

  static async getVerseByKey(verseKey, opts = {}) {
    const { translationId = CONFIG.DEFAULT_TRANSLATION_ID } = opts;
    return new RequestBuilder(`/content/api/v4/verses/by_key/${verseKey}`)
      .withParam('translations', translationId)
      .withParam('fields', 'text_uthmani,chapter_id,verse_number,verse_key,juz_number')
      .withParam('audio', 7)
      .fetch();
  }

  static async getRandomVerse(opts = {}) {
    const { translationId = CONFIG.DEFAULT_TRANSLATION_ID } = opts;
    return new RequestBuilder('/content/api/v4/verses/random')
      .withParam('translations', translationId)
      .withParam('fields', 'text_uthmani,chapter_id,verse_number,verse_key,juz_number')
      .withParam('audio', 7)
      .fetch();
  }

  static async searchVerses(query, opts = {}) {
    const { language = 'en', size = 15, page = 0 } = opts;
    return new RequestBuilder('/content/api/v4/search')
      .withParam('q', query)
      .withParam('size', size)
      .withParam('page', page)
      .withParam('language', language)
      .fetch();
  }

  static async getVerseAudio(verseKey, recitationId = CONFIG.DEFAULT_RECITER_ID) {
    return new RequestBuilder(
      `/content/api/v4/recitations/${recitationId}/by_ayah/${verseKey}`,
    ).fetch();
  }

  static async getTafsirByVerse(verseKey, tafsirId = CONFIG.DEFAULT_TAFSIR_ID) {
    return new RequestBuilder(
      `/content/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`,
    ).fetch();
  }
}

export { QuranRepository, QuranTokenManager, RequestBuilder };
