import { userApiLog } from "@/lib/logger";

/**
 * @fileoverview Quran Foundation User API Client
 *
 * Provides access to all personalization and user-data endpoints:
 * bookmarks, collections, streaks, goals, activity, notes, and preferences.
 *
 * Design Patterns:
 *  - Repository : UserRepository — single source of truth for all user data ops
 *  - Strategy   : Each resource type (Bookmarks, Goals, etc.) is a focused
 *                 static helper group inside the repository — easy to extend.
 *  - Null Object: Methods return safe empty defaults instead of throwing on 404s
 *
 * All methods require a valid user access token obtained via OAuth2 PKCE flow.
 * @see https://api-docs.quran.foundation/docs/quickstart
 */

// User APIs typically live on pre-live; gracefully fall back to primary env vars.
const API_BASE = process.env.QURAN_PRELIVE_API_BASE ?? process.env.QURAN_API_BASE;
const CLIENT_ID = process.env.QURAN_PRELIVE_CLIENT_ID ?? process.env.QURAN_CLIENT_ID;
const USER_API_PREFIX = "/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends an authenticated request to the User API.
 *
 * @param {string} path - API path relative to API_BASE
 * @param {string} userToken - OAuth2 Bearer token for the authenticated user
 * @param {object} [options] - Fetch options (method, body, etc.)
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} On non-2xx HTTP responses (except 404 which returns null)
 */
async function userApiRequest(path, userToken, options = {}) {
  const url = `${API_BASE}${path}`;
  const t0 = Date.now();
  const method = options.method ?? "GET";

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${userToken}`,
      "x-auth-token": userToken,
      "x-client-id": CLIENT_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  userApiLog.info("user_api_response", {
    method,
    path,
    status: res.status,
    durationMs: Date.now() - t0,
  });

  // 204 No Content — successful but no body to parse
  if (res.status === 204) return null;

  // 404 — resource not found, return null instead of throwing
  if (res.status === 404) return null;

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    userApiLog.warn("user_api_error", { path, status: res.status, bodySnippet: errorBody.slice(0, 500) });
    throw new Error(`User API error [${res.status}] ${path}: ${errorBody}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository: User Repository
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Repository providing access to all Quran Foundation User API resources.
 * Organized into logical sub-groups matching the API surface.
 */
class UserRepository {
  // ── Activity & Streaks ────────────────────────────────────────────────────

  /**
   * Retrieves the user's current reading streak.
   * @param {string} userToken - OAuth2 Bearer token
   * @returns {Promise<{streak: number, last_activity_date: string}|null>}
   */
  static async getStreak(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/streaks`, userToken);
  }

  /**
   * Retrieves the user's reading activity log (days read, sessions, etc.).
   * @param {string} userToken
   * @returns {Promise<{activity: Array}|null>}
   */
  static async getActivity(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/activity_days`, userToken);
  }

  /**
   * Records that the user has completed a reading session today.
   * Should be called when a user listens to or reads a verse.
   * @param {string} userToken
   * @param {object} sessionData - Session details (verse_key, duration_ms, etc.)
   * @returns {Promise<any>}
   */
  static async recordReadingSession(userToken, sessionData) {
    return userApiRequest(`${USER_API_PREFIX}/reading_sessions`, userToken, {
      method: "POST",
      body: JSON.stringify(sessionData),
    });
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  /**
   * Retrieves all reading goals for the authenticated user.
   * @param {string} userToken
   * @returns {Promise<{goals: Array}|null>}
   */
  static async getGoals(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/goals`, userToken);
  }

  /**
   * Creates a new post-Ramadan reading goal.
   * @param {string} userToken
   * @param {object} goal
   * @param {string} goal.type - Goal type ('reading_amount', 'memorization', etc.)
   * @param {string} goal.target - Target description
   * @param {string} goal.targetDate - ISO date string for the deadline
   * @param {number} [goal.dailyMinutes] - Daily commitment in minutes
   * @returns {Promise<{goal: object}>}
   */
  static async createGoal(userToken, goal) {
    return userApiRequest(`${USER_API_PREFIX}/goals`, userToken, {
      method: "POST",
      body: JSON.stringify(goal),
    });
  }

  /**
   * Updates the progress or details of an existing goal.
   * @param {string} userToken
   * @param {string} goalId
   * @param {object} updates - Partial goal object with fields to update
   * @returns {Promise<{goal: object}>}
   */
  static async updateGoal(userToken, goalId, updates) {
    return userApiRequest(`${USER_API_PREFIX}/goals/${goalId}`, userToken, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Deletes a goal by ID.
   * @param {string} userToken
   * @param {string} goalId
   * @returns {Promise<null>}
   */
  static async deleteGoal(userToken, goalId) {
    return userApiRequest(`${USER_API_PREFIX}/goals/${goalId}`, userToken, {
      method: "DELETE",
    });
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────

  /**
   * Retrieves all bookmarked verses for the user.
   * @param {string} userToken
   * @returns {Promise<{bookmarks: Array}|null>}
   */
  static async getBookmarks(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/bookmarks`, userToken);
  }

  /**
   * Bookmarks a verse by its key.
   * @param {string} userToken
   * @param {string} verseKey - e.g. "2:255"
   * @returns {Promise<{bookmark: object}>}
   */
  static async addBookmark(userToken, verseKey) {
    return userApiRequest(`${USER_API_PREFIX}/bookmarks`, userToken, {
      method: "POST",
      body: JSON.stringify({ verse_key: verseKey }),
    });
  }

  /**
   * Removes a bookmark by verse key.
   * @param {string} userToken
   * @param {string} verseKey - e.g. "2:255"
   * @returns {Promise<null>}
   */
  static async removeBookmark(userToken, verseKey) {
    return userApiRequest(`${USER_API_PREFIX}/bookmarks/${verseKey}`, userToken, {
      method: "DELETE",
    });
  }

  // ── Collections ───────────────────────────────────────────────────────────

  /**
   * Retrieves all user-created verse collections.
   * @param {string} userToken
   * @returns {Promise<{collections: Array}|null>}
   */
  static async getCollections(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/collections`, userToken);
  }

  /**
   * Creates a new named collection (e.g. "Verses of Comfort").
   * @param {string} userToken
   * @param {string} name - Display name for the collection
   * @returns {Promise<{collection: object}>}
   */
  static async createCollection(userToken, name) {
    return userApiRequest(`${USER_API_PREFIX}/collections`, userToken, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Adds a verse to an existing collection.
   * @param {string} userToken
   * @param {string} collectionId
   * @param {string} verseKey - e.g. "2:255"
   * @returns {Promise<any>}
   */
  static async addToCollection(userToken, collectionId, verseKey) {
    return userApiRequest(`${USER_API_PREFIX}/collections/${collectionId}/verses`, userToken, {
      method: "POST",
      body: JSON.stringify({ verse_key: verseKey }),
    });
  }

  /**
   * Removes a verse from a collection.
   * @param {string} userToken
   * @param {string} collectionId
   * @param {string} verseKey
   * @returns {Promise<null>}
   */
  static async removeFromCollection(userToken, collectionId, verseKey) {
    return userApiRequest(`${USER_API_PREFIX}/collections/${collectionId}/verses/${verseKey}`, userToken, {
      method: "DELETE",
    });
  }

  /**
   * Deletes an entire collection.
   * @param {string} userToken
   * @param {string} collectionId
   * @returns {Promise<null>}
   */
  static async deleteCollection(userToken, collectionId) {
    return userApiRequest(`${USER_API_PREFIX}/collections/${collectionId}`, userToken, {
      method: "DELETE",
    });
  }

  // ── Notes / Reflections ───────────────────────────────────────────────────

  /**
   * Retrieves all personal reflection notes for the user.
   * @param {string} userToken
   * @returns {Promise<{notes: Array}|null>}
   */
  static async getNotes(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/notes`, userToken);
  }

  /**
   * Creates a reflection note linked to a specific verse.
   * @param {string} userToken
   * @param {string} verseKey - The verse this note belongs to
   * @param {string} text - Note content
   * @returns {Promise<{note: object}>}
   */
  static async createNote(userToken, verseKey, text) {
    return userApiRequest(`${USER_API_PREFIX}/notes`, userToken, {
      method: "POST",
      body: JSON.stringify({ verse_key: verseKey, body: text }),
    });
  }

  /**
   * Updates an existing reflection note.
   * @param {string} userToken
   * @param {string} noteId
   * @param {string} text - Updated note content
   * @returns {Promise<{note: object}>}
   */
  static async updateNote(userToken, noteId, text) {
    return userApiRequest(`${USER_API_PREFIX}/notes/${noteId}`, userToken, {
      method: "PATCH",
      body: JSON.stringify({ body: text }),
    });
  }

  /**
   * Deletes a reflection note.
   * @param {string} userToken
   * @param {string} noteId
   * @returns {Promise<null>}
   */
  static async deleteNote(userToken, noteId) {
    return userApiRequest(`${USER_API_PREFIX}/notes/${noteId}`, userToken, {
      method: "DELETE",
    });
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  /**
   * Retrieves user preferences (reciter, translation, language, etc.).
   * @param {string} userToken
   * @returns {Promise<{preferences: object}|null>}
   */
  static async getPreferences(userToken) {
    return userApiRequest(`${USER_API_PREFIX}/preferences`, userToken);
  }

  /**
   * Updates user preferences.
   * @param {string} userToken
   * @param {object} prefs - Preference fields to update
   * @returns {Promise<{preferences: object}>}
   */
  static async updatePreferences(userToken, prefs) {
    return userApiRequest(`${USER_API_PREFIX}/preferences`, userToken, {
      method: "PATCH",
      body: JSON.stringify(prefs),
    });
  }
}

export { UserRepository };
