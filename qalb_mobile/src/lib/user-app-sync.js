/**
 * Supabase-backed storage sync (parity with web lib/user-app-sync-bridge.js).
 * Pull/push via Next /api/user/app-storage/* with Bearer mobile JWT.
 */

import {
  mergeKeyThemesPayload,
  mergePreferencesPayload,
  mergeReadingProgress,
  mergeRecentByHref,
  mergeVerseKeyedBlob,
} from '../../../lib/merge-user-app-storage';
import { LS_LAST_HADITH_READS, MAX_LAST_HADITH_READS } from '../../../lib/last-hadith-reads';
import { LS_QALB_LAST_READS, MAX_QURAN_LAST_READS } from '../../../lib/qalb-last-reads';
import { normalizeReadingScale } from '../../../lib/reading-scale';

import { apiFetch } from './api-with-auth';
import { getStoredMobileJwt } from './mobile-auth';
import { emitAccountStorageSynced } from './qalb-events';
import storage, { STORAGE_KEYS } from './storage';

const DEBOUNCE_MS = 1800;
const PULL_PATCH_SUPPRESS_MS = 2800;

let lastPullCompletedAt = 0;
let lastKnownCloudEnabled = null;
const debounceTimers = new Map();

function debounce(key, fn) {
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void fn();
    }, DEBOUNCE_MS),
  );
}

export function markAccountStoragePullCompleted() {
  lastPullCompletedAt = Date.now();
}

function shouldSuppressPushAfterPull() {
  return Date.now() - lastPullCompletedAt < PULL_PATCH_SUPPRESS_MS;
}

async function isSignedIn() {
  return Boolean(await getStoredMobileJwt());
}

async function patchNamespace(namespace, payload) {
  if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
  if (lastKnownCloudEnabled === false) return;
  try {
    const res = await apiFetch(`/api/user/app-storage/${namespace}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    if (res.status === 503) lastKnownCloudEnabled = false;
    else if (res.ok) lastKnownCloudEnabled = true;
  } catch {
    /* ignore */
  }
}

async function applyPreferencesFromServer(payload) {
  if (!payload || typeof payload !== 'object') return;
  const rawTheme = await storage.getRaw(STORAGE_KEYS.THEME);
  const localTheme = rawTheme === 'light' || rawTheme === 'dark' ? rawTheme : 'dark';
  const localScale = normalizeReadingScale(await storage.get(STORAGE_KEYS.READING_SCALE));
  const recRaw = await storage.get(STORAGE_KEYS.RECITER_ID);
  const localRec = typeof recRaw === 'number' ? recRaw : parseInt(String(recRaw ?? '7'), 10);
  const merged = mergePreferencesPayload(payload, localTheme, localScale, Number.isFinite(localRec) ? localRec : 7, 'uthmani', false);
  await storage.set(STORAGE_KEYS.RECITER_ID, merged.reciterId);
  await storage.set(STORAGE_KEYS.READING_SCALE, merged.readingScale);
  await storage.setRaw(STORAGE_KEYS.THEME, merged.theme === 'light' ? 'light' : 'dark');
}

/**
 * @returns {Promise<{ cloudEnabled: boolean; wrote: boolean }>}
 */
export async function pullAccountScopedStorageIntoDevice() {
  if (!(await isSignedIn())) return { cloudEnabled: false, wrote: false };

  let wrote = false;

  try {
    const [pr, pg, ph, jref, jchat, jnotes, jthemes, jgoals] = await Promise.all([
      apiFetch('/api/user/app-storage/preferences'),
      apiFetch('/api/user/app-storage/reading_progress'),
      apiFetch('/api/user/app-storage/reading_history'),
      apiFetch('/api/user/app-storage/verse_reflections'),
      apiFetch('/api/user/app-storage/verse_chat'),
      apiFetch('/api/user/app-storage/verse_notes'),
      apiFetch('/api/user/app-storage/read_key_themes'),
      apiFetch('/api/user/app-storage/goals_local'),
    ]);

    const jp = await pr.json();
    const jg = await pg.json();
    const jh = await ph.json();
    const vref = await jref.json();
    const vchat = await jchat.json();
    const vnotes = await jnotes.json();
    const kthemes = await jthemes.json();
    const goals = await jgoals.json();

    const cloudEnabled =
      jp.enabled === true ||
      jg.enabled === true ||
      jh.enabled === true ||
      vref.enabled === true ||
      vchat.enabled === true ||
      vnotes.enabled === true ||
      kthemes.enabled === true ||
      goals.enabled === true;
    lastKnownCloudEnabled = cloudEnabled;

    if (jp.enabled === true && jp.payload && typeof jp.payload === 'object') {
      await applyPreferencesFromServer(jp.payload);
      wrote = true;
    }

    if (jg.enabled === true) {
      const localProg = await storage.get(STORAGE_KEYS.READING_PROGRESS);
      const localNorm =
        localProg && typeof localProg === 'object' && localProg.surahId == null && localProg.chapterId != null
          ? { ...localProg, surahId: localProg.chapterId }
          : localProg;
      const merged = jg.payload && typeof jg.payload === 'object' ? mergeReadingProgress(jg.payload, localNorm) : null;
      if (merged) {
        await storage.set(STORAGE_KEYS.READING_PROGRESS, {
          ...merged,
          chapterId: merged.surahId,
        });
      } else await storage.remove(STORAGE_KEYS.READING_PROGRESS);
      wrote = true;
    }

    if (jh.enabled === true) {
      const payload = jh.payload && typeof jh.payload === 'object' ? jh.payload : {};
      const mergedQ = mergeRecentByHref(payload.lastQuranReads, [], MAX_QURAN_LAST_READS);
      const mergedH = mergeRecentByHref(payload.lastHadithReads, [], MAX_LAST_HADITH_READS);
      await storage.set(STORAGE_KEYS.QALB_LAST_READS, mergedQ);
      await storage.set(STORAGE_KEYS.LAST_HADITH_READS, mergedH);
      wrote = true;
    }

    if (vref.enabled === true && vref.payload && typeof vref.payload === 'object') {
      const local = (await storage.get(STORAGE_KEYS.REFLECTIONS)) ?? {};
      const merged = mergeVerseKeyedBlob(vref.payload, typeof local === 'object' && local && !Array.isArray(local) ? local : {});
      await storage.set(STORAGE_KEYS.REFLECTIONS, merged);
      wrote = true;
    }

    if (vchat.enabled === true && vchat.payload && typeof vchat.payload === 'object') {
      const local = (await storage.get(STORAGE_KEYS.CHAT)) ?? {};
      const merged = mergeVerseKeyedBlob(vchat.payload, typeof local === 'object' && local && !Array.isArray(local) ? local : {});
      await storage.set(STORAGE_KEYS.CHAT, merged);
      wrote = true;
    }

    if (vnotes.enabled === true && vnotes.payload && typeof vnotes.payload === 'object') {
      const local = (await storage.get(STORAGE_KEYS.NOTES)) ?? {};
      const merged = mergeVerseKeyedBlob(vnotes.payload, typeof local === 'object' && local && !Array.isArray(local) ? local : {});
      await storage.set(STORAGE_KEYS.NOTES, merged);
      wrote = true;
    }

    if (kthemes.enabled === true && kthemes.payload && typeof kthemes.payload === 'object') {
      const localDoc = (await storage.get(STORAGE_KEYS.READ_KEY_THEMES)) ?? { themesBySurahId: {} };
      const merged = mergeKeyThemesPayload(
        kthemes.payload,
        typeof localDoc === 'object' && localDoc ? localDoc : { themesBySurahId: {} },
      );
      await storage.set(STORAGE_KEYS.READ_KEY_THEMES, merged);
      wrote = true;
    }

    if (goals.enabled === true && goals.payload && typeof goals.payload === 'object') {
      const payload = goals.payload.timeTracking;
      if (payload && typeof payload === 'object') {
        await storage.set(STORAGE_KEYS.TIME_TRACKING, payload);
        wrote = true;
      }
    }

    markAccountStoragePullCompleted();
    if (wrote || cloudEnabled) emitAccountStorageSynced();
    return { cloudEnabled, wrote };
  } catch {
    markAccountStoragePullCompleted();
    return { cloudEnabled: false, wrote };
  }
}

export function schedulePushPreferences() {
  debounce('preferences', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const rawTheme = await storage.getRaw(STORAGE_KEYS.THEME);
    const localTheme = rawTheme === 'light' ? 'light' : 'dark';
    const scale = normalizeReadingScale(await storage.get(STORAGE_KEYS.READING_SCALE));
    const recRaw = await storage.get(STORAGE_KEYS.RECITER_ID);
    const rec = parseInt(String(recRaw ?? '7'), 10);
    await patchNamespace('preferences', {
      theme: localTheme,
      readingScale: scale,
      reciterId: Number.isFinite(rec) ? rec : 7,
      quranScript: 'uthmani',
      tajweedEnabled: false,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushReadingProgress() {
  debounce('reading_progress', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const cur = await storage.get(STORAGE_KEYS.READING_PROGRESS);
    if (!cur?.surahId && !cur?.chapterId) return;
    const surahId = cur.surahId ?? cur.chapterId;
    await patchNamespace('reading_progress', {
      surahId: Number(surahId),
      verseNum: cur.verseNum != null ? Number(cur.verseNum) : 1,
      translationId: cur.translationId != null ? Number(cur.translationId) : 20,
      mushafPage: cur.mushafPage != null ? Number(cur.mushafPage) : undefined,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushReadingHistory() {
  debounce('reading_history', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const lastQuranReads = (await storage.get(STORAGE_KEYS.QALB_LAST_READS)) ?? [];
    const lastHadithReads = (await storage.get(STORAGE_KEYS.LAST_HADITH_READS)) ?? [];
    await patchNamespace('reading_history', {
      lastQuranReads: Array.isArray(lastQuranReads) ? lastQuranReads : [],
      lastHadithReads: Array.isArray(lastHadithReads) ? lastHadithReads : [],
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushVerseReflections() {
  debounce('verse_reflections', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = (await storage.get(STORAGE_KEYS.REFLECTIONS)) ?? {};
    await patchNamespace('verse_reflections', typeof blob === 'object' && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushVerseChat() {
  debounce('verse_chat', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = (await storage.get(STORAGE_KEYS.CHAT)) ?? {};
    await patchNamespace('verse_chat', typeof blob === 'object' && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushVerseNotes() {
  debounce('verse_notes', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = (await storage.get(STORAGE_KEYS.NOTES)) ?? {};
    await patchNamespace('verse_notes', typeof blob === 'object' && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushReadKeyThemes() {
  debounce('read_key_themes', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const doc = (await storage.get(STORAGE_KEYS.READ_KEY_THEMES)) ?? { themesBySurahId: {} };
    const themesBySurahId =
      doc && typeof doc === 'object' && doc.themesBySurahId && typeof doc.themesBySurahId === 'object'
        ? doc.themesBySurahId
        : {};
    await patchNamespace('read_key_themes', {
      themesBySurahId,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushGoalsLocal() {
  debounce('goals_local', async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const timeTracking = (await storage.get(STORAGE_KEYS.TIME_TRACKING)) ?? {};
    await patchNamespace('goals_local', {
      timeTracking: typeof timeTracking === 'object' && timeTracking && !Array.isArray(timeTracking) ? timeTracking : {},
      updatedAt: Date.now(),
    });
  });
}
