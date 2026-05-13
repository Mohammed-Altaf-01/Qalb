import AsyncStorage from "@react-native-async-storage/async-storage";

/** All AsyncStorage keys — mirrors web localStorage / qalb-storage-keys */
export const STORAGE_KEYS = {
  BOOKMARKS: "qalb_bookmarks",
  REFLECTIONS: "qalb_reflections",
  NOTES: "qalb_notes",
  CHAT: "qalb_chat",
  RECITER_ID: "qalb_reciter_id",
  READING_PROGRESS: "qalb_reading_progress",
  READING_HISTORY: "qalb_reading_history",
  GOALS: "qalb_goals",
  /** Same key as web — `lib/user-app-sync-bridge` LS_LIBRARY_COLLECTIONS */
  LIBRARY_COLLECTIONS: "qalb_library_collections",
  SPLASH_SHOWN: "qalb_splash_shown_session",
  GAMIFICATION: "qalb_gamification",
  TEXT_SIZE: "qalb_text_size",
  DISCOVER_HISTORY: "qalb_discover_history",
  READ_KEY_THEMES: "qalb_read_key_themes",
  QALB_LAST_READS: "qalb_last_reads",
  LAST_HADITH_READS: "qalb_last_hadith_reads",
  TIME_TRACKING: "qalb_time_tracking",
  READING_SCALE: "qalb_reading_scale",
  THEME: "qalb_theme",
  /** Match web `lib/quran-text-preferences` LS_* */
  QURAN_SCRIPT: "qalb_quran_script",
  QURAN_TAJWEED: "qalb_quran_tajweed",
};

/** Drop-in AsyncStorage wrapper that always returns parsed JSON */
const storage = {
  async get(key) {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },

  async getRaw(key) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[storage] set failed:", key, e);
    }
  },

  async setRaw(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn("[storage] setRaw failed:", key, e);
    }
  },

  async remove(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  async merge(key, partial) {
    const existing = (await this.get(key)) ?? {};
    await this.set(key, { ...existing, ...partial });
  },
};

export default storage;
