/**
 * @fileoverview Quran Foundation Content API Client
 *
 * Implements the Repository pattern to abstract all Content API interactions.
 * Uses a Singleton for token management and a Builder for request construction.
 *
 * Design Patterns:
 *  - Singleton   : QuranTokenManager — ensures one shared token across all requests
 *  - Repository  : QuranRepository   — single source of truth for all Quran data
 *  - Builder     : RequestBuilder     — fluent interface for composing API requests
 *
 * @see https://api-docs.quran.foundation/docs/content_apis_versioned/content-apis
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.QURAN_API_BASE;
const OAUTH_ENDPOINT = process.env.QURAN_OAUTH_ENDPOINT;
const CLIENT_ID = process.env.QURAN_CLIENT_ID;
const CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET;

/** Token expiry buffer in ms — refresh 60 s before actual expiry */
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
// Singleton: Token Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages OAuth2 Client Credentials tokens for the Quran Foundation Content API.
 *
 * Implemented as a Singleton so the token is shared across all repository
 * instances, preventing redundant token requests on every API call.
 */
class QuranTokenManager {
  /** @type {QuranTokenManager|null} */
  static #instance = null;

  /** @type {string|null} */
  #accessToken = null;

  /** @type {number} Unix timestamp (ms) when the token expires */
  #expiresAt = 0;

  /** Private constructor enforces Singleton usage via getInstance() */
  constructor() {}

  /**
   * Returns the shared singleton instance.
   * @returns {QuranTokenManager}
   */
  static getInstance() {
    if (!QuranTokenManager.#instance) {
      QuranTokenManager.#instance = new QuranTokenManager();
    }
    return QuranTokenManager.#instance;
  }

  /**
   * Returns a valid access token, fetching a new one if expired or missing.
   * @returns {Promise<string>} A valid Bearer access token
   * @throws {Error} If the token request fails
   */
  async getToken() {
    if (this.#accessToken && Date.now() < this.#expiresAt) {
      return this.#accessToken;
    }
    return this.#fetchNewToken();
  }

  /**
   * Fetches a new token from the OAuth2 endpoint using Client Credentials flow.
   * @private
   * @returns {Promise<string>}
   */
  async #fetchNewToken() {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const res = await fetch(`${OAUTH_ENDPOINT}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=content",
    });

    if (!res.ok) {
      throw new Error(`Token fetch failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    this.#accessToken = data.access_token;
    // Store expiry with a safety buffer so we refresh before the token dies
    this.#expiresAt = Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;

    return this.#accessToken;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder: Request Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache TTL constants.
 *
 * Quran text is immutable — cache indefinitely (false = no time-based expiry).
 * Audio CDN URLs may rotate — 24 h is safe.
 * Search results are query-dependent — 5 min keeps them fresh.
 */
export const CACHE_TTL = {
  FOREVER: false, // Quran text, chapter metadata — never changes
  AUDIO: 86_400, // Audio URLs — 24 h
  SEARCH: 300, // Search results — 5 min
  DEFAULT: 3_600, // Fallback — 1 h
};

/**
 * Fluent Builder for constructing authenticated Quran Foundation API requests.
 *
 * Usage:
 *   const data = await new RequestBuilder('/content/api/v4/chapters')
 *     .withParam('language', 'en')
 *     .withCache(CACHE_TTL.FOREVER)
 *     .fetch();
 */
class RequestBuilder {
  /**
   * @param {string} path - API path (e.g. '/content/api/v4/chapters')
   */
  constructor(path) {
    this.path = path;
    this.params = new URLSearchParams();
    this.tokenManager = QuranTokenManager.getInstance();
    this._revalidate = CACHE_TTL.DEFAULT;
  }

  /**
   * Adds a query parameter to the request.
   * @param {string} key
   * @param {string|number} value
   * @returns {RequestBuilder} this (for chaining)
   */
  withParam(key, value) {
    if (value !== undefined && value !== null) {
      this.params.set(String(key), String(value));
    }
    return this;
  }

  /**
   * Sets the Next.js Data Cache revalidation strategy.
   * @param {number|false} ttl - Seconds to cache, or false for indefinite caching
   * @returns {RequestBuilder} this (for chaining)
   */
  withCache(ttl) {
    this._revalidate = ttl;
    return this;
  }

  /**
   * Executes the built request and returns parsed JSON.
   * @returns {Promise<any>}
   * @throws {Error} On non-2xx HTTP responses
   */
  async fetch() {
    const token = await this.tokenManager.getToken();
    const queryString = this.params.toString();
    const url = `${API_BASE}${this.path}${queryString ? `?${queryString}` : ""}`;

    const res = await fetch(url, {
      headers: {
        "x-auth-token": token,
        "x-client-id": CLIENT_ID,
        Accept: "application/json",
      },
      next: { revalidate: this._revalidate },
    });

    if (!res.ok) {
      throw new Error(`Quran API error [${res.status}] ${this.path}: ${res.statusText}`);
    }

    return res.json();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository: Quran Repository
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Repository providing access to all Quran Foundation Content API resources.
 *
 * All methods return plain JS objects matching the Quran Foundation API shape.
 * Consumers should not depend on internal fetch/auth details — only this class.
 */
class QuranRepository {
  // ── Chapters ────────────────────────────────────────────────────────────────

  /**
   * Retrieves the list of all 114 Quranic chapters (surahs).
   * @param {string} [language='en'] - ISO 639-1 language code for chapter names
   * @returns {Promise<{chapters: Array}>}
   */
  static async getChapters(language = "en") {
    return new RequestBuilder("/content/api/v4/chapters")
      .withParam("language", language)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves info for a single chapter.
   * @param {number} chapterId - Chapter number (1–114)
   * @param {string} [language='en']
   * @returns {Promise<{chapter: object}>}
   */
  static async getChapter(chapterId, language = "en") {
    return new RequestBuilder(`/content/api/v4/chapters/${chapterId}`)
      .withParam("language", language)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  // ── Verses ──────────────────────────────────────────────────────────────────

  /**
   * Retrieves verses for a given chapter with translations and audio.
   * @param {number} chapterId - Chapter number (1–114)
   * @param {object} [opts]
   * @param {number} [opts.translationId=131] - Translation resource ID (20 = Saheeh International)
   * @param {string} [opts.language='en']
   * @param {number} [opts.perPage=10]
   * @param {number} [opts.page=1]
   * @returns {Promise<{verses: Array, pagination: object}>}
   */
  static async getVersesByChapter(chapterId, opts = {}) {
    const { translationId = 20, language = "en", perPage = 10, page = 1 } = opts;
    return new RequestBuilder(`/content/api/v4/verses/by_chapter/${chapterId}`)
      .withParam("translations", translationId)
      .withParam("language", language)
      .withParam("per_page", perPage)
      .withParam("page", page)
      .withParam("fields", "text_uthmani,chapter_id,verse_number,verse_key,juz_number,page_number,hizb_number")
      .withParam("words", "true")
      .withParam("word_fields", "text_uthmani,position")
      .withParam("audio", 7)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves verses by Mushaf page number (1-604), across chapter boundaries.
   * @param {number} pageNumber
   * @param {object} [opts]
   * @param {number} [opts.translationId=20]
   * @param {string} [opts.language='en']
   * @returns {Promise<{verses: Array, pagination: object}>}
   */
  static async getVersesByPage(pageNumber, opts = {}) {
    const { translationId = 20, language = "en" } = opts;
    return new RequestBuilder(`/content/api/v4/verses/by_page/${pageNumber}`)
      .withParam("translations", translationId)
      .withParam("language", language)
      .withParam("fields", "text_uthmani,chapter_id,verse_number,verse_key,juz_number,page_number,hizb_number")
      .withParam("words", "true")
      .withParam("word_fields", "text_uthmani,position")
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves a single verse by its key (e.g. "2:255" for Ayat al-Kursi).
   * @param {string} verseKey - Format "chapterId:verseNumber" e.g. "2:255"
   * @param {object} [opts]
   * @param {number} [opts.translationId=131]
   * @returns {Promise<{verse: object}>}
   */
  static async getVerseByKey(verseKey, opts = {}) {
    const { translationId = 20 } = opts;
    return new RequestBuilder(`/content/api/v4/verses/by_key/${verseKey}`)
      .withParam("translations", translationId)
      .withParam("fields", "text_uthmani,chapter_id,verse_number,verse_key,juz_number,page_number,hizb_number,words")
      .withParam("audio", 7)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves a random verse — used for the "Daily Verse" feature.
   * @param {object} [opts]
   * @param {number} [opts.translationId=131]
   * @returns {Promise<{verse: object}>}
   */
  static async getRandomVerse(opts = {}) {
    const { translationId = 20 } = opts;
    // Random verse must never be cached — each call must hit the API
    return new RequestBuilder("/content/api/v4/verses/random")
      .withParam("translations", translationId)
      .withParam("fields", "text_uthmani,chapter_id,verse_number,verse_key,juz_number")
      .withParam("audio", 7)
      .withCache(0)
      .fetch();
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  /**
   * Full-text searches the Quran — powers the AI contextual discovery feature.
   * @param {string} query - Search query string
   * @param {object} [opts]
   * @param {string} [opts.language='en']
   * @param {number} [opts.size=10] - Max results to return
   * @param {number} [opts.page=0]
   * @returns {Promise<{search: {results: Array, total_results: number}}>}
   */
  static async searchVerses(query, opts = {}) {
    const { language = "en", size = 10, page = 0 } = opts;
    return new RequestBuilder("/content/api/v4/search")
      .withParam("q", query)
      .withParam("size", size)
      .withParam("page", page)
      .withParam("language", language)
      .withCache(CACHE_TTL.SEARCH)
      .fetch();
  }

  // ── Audio ────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all available reciters.
   * @param {string} [language='en']
   * @returns {Promise<{audio_files: Array}>}
   */
  static async getReciters(language = "en") {
    return new RequestBuilder("/content/api/v4/resources/recitations")
      .withParam("language", language)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves audio file info for a specific verse and reciter.
   * @param {string} verseKey - e.g. "2:255"
   * @param {number} [recitationId=7] - Recitation resource ID
   * @returns {Promise<{audio_files: Array}>}
   */
  static async getVerseAudio(verseKey, recitationId = 7, withSegments = false) {
    const builder = new RequestBuilder(`/content/api/v4/recitations/${recitationId}/by_ayah/${verseKey}`).withCache(
      CACHE_TTL.AUDIO,
    );
    if (withSegments) builder.withParam("fields", "segments");
    return builder.fetch();
  }

  // ── Tafsir ───────────────────────────────────────────────────────────────────

  /**
   * Retrieves available tafsir resources.
   * @param {string} [language='en']
   * @returns {Promise<{tafsirs: Array}>}
   */
  static async getTafsirList(language = "en") {
    return new RequestBuilder("/content/api/v4/resources/tafsirs")
      .withParam("language", language)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves tafsir for a specific chapter.
   * @param {number} chapterId - Chapter number (1–114)
   * @param {number} [tafsirId=169] - 169 = Ibn Kathir (most widely used)
   * @returns {Promise<{tafsir: object}>}
   */
  static async getTafsirByChapter(chapterId, tafsirId = 169) {
    return new RequestBuilder(`/content/api/v4/tafsirs/${tafsirId}/by_chapter/${chapterId}`)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  /**
   * Retrieves tafsir for a single verse.
   * @param {string} verseKey - e.g. "2:255"
   * @param {number} [tafsirId=169]
   * @returns {Promise<{tafsir: object}>}
   */
  static async getTafsirByVerse(verseKey, tafsirId = 169) {
    return new RequestBuilder(`/content/api/v4/tafsirs/${tafsirId}/by_ayah/${verseKey}`)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  // ── Translations ─────────────────────────────────────────────────────────────

  /**
   * Retrieves available translation resources.
   * @param {string} [language='en']
   * @returns {Promise<{translations: Array}>}
   */
  static async getTranslationList(language = "en") {
    return new RequestBuilder("/content/api/v4/resources/translations")
      .withParam("language", language)
      .withCache(CACHE_TTL.FOREVER)
      .fetch();
  }

  // ── Juz / Structure ───────────────────────────────────────────────────────────

  /**
   * Retrieves all 30 Juz sections of the Quran.
   * @returns {Promise<{juzs: Array}>}
   */
  static async getJuzList() {
    return new RequestBuilder("/content/api/v4/juzs").withCache(CACHE_TTL.FOREVER).fetch();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { QuranRepository, QuranTokenManager, RequestBuilder };
