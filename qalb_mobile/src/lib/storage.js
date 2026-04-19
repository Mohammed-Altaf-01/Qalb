import AsyncStorage from '@react-native-async-storage/async-storage';

/** All AsyncStorage keys used by the app — mirrors web localStorage keys */
export const STORAGE_KEYS = {
  BOOKMARKS: 'qalb_bookmarks',
  REFLECTIONS: 'qalb_reflections',
  NOTES: 'qalb_notes',
  CHAT: 'qalb_chat',
  RECITER_ID: 'qalb_reciter_id',
  READING_PROGRESS: 'qalb_reading_progress',
  GOALS: 'qalb_goals',
  COLLECTIONS: 'qalb_collections',
  SPLASH_SHOWN: 'qalb_splash_shown_session',
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

  async set(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[storage] set failed:', key, e);
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
