/**
 * Client-side sync between Supabase `app_user_storage` (per NextAuth user id) and localStorage.
 * Pull runs after login; pushes are debounced when local state changes.
 */
import { getSession } from "next-auth/react";

import { LS_KHATM_MILESTONES } from "@/lib/khatm-milestones";
import { LS_LAST_HADITH_READS, MAX_LAST_HADITH_READS } from "@/lib/last-hadith-reads";
import {
  mergeBookmarksMap,
  mergeDiscoverHistory,
  mergeHifzCards,
  mergeKeyThemesPayload,
  mergeKhatmPayload,
  mergeLibraryCollectionsPayload,
  mergePreferencesPayload,
  mergeListenHistoryPayload,
  mergeReadingGoals,
  mergeReadingProgress,
  mergeRecentByHref,
  mergeTimeTracking,
  mergeVerseKeyedBlob,
} from "@/lib/merge-user-app-storage";
import { ADHAN_ENABLED_KEY } from "@/lib/prayer-adhan";
import { LS_HIFZ_PREFS_V1, normalizeHifzPrefs } from "@/lib/hifz-prefs";
import { LS_DISCOVER_HISTORY } from "@/lib/qalb-discover-history";
import {
  LS_DAILY_LETTER_DAY,
  LS_DAILY_LETTER_TEXT,
  LS_GOALS,
  LS_LIVE_VIDEO_FIT,
  LS_PRAYER_COORDS,
} from "@/lib/user-state-registry";
import { LS_QALB_LAST_READS, MAX_QURAN_LAST_READS } from "@/lib/qalb-last-reads";
import { LS_QALB_LISTEN_HISTORY, loadListenHistoryPayload, normalizeListenHistoryPayload } from "@/lib/listen-history";
import {
  LS_HIFZ_PROGRESS_KEY,
  LS_KHATM_PAGES_KEY,
  LS_READING_PROGRESS_KEY,
  LS_READ_KEY_THEMES,
} from "@/lib/qalb-storage-keys";
import { LS_VERSE_CHAT, LS_VERSE_NOTES, LS_VERSE_REFLECTIONS } from "@/lib/qalb-verse-local-keys";
import {
  LS_QURAN_SCRIPT,
  LS_QURAN_TAJWEED,
  normalizeQuranScript,
  parseTajweedPreference,
} from "@/lib/quran-text-preferences";
import { LS_READING_SCALE, applyReadingScaleToDocument, normalizeReadingScale } from "@/lib/reading-scale";

/** Fired after cloud data is merged into localStorage — home/read/hadith UIs listen to refresh chips. */
export const ACCOUNT_STORAGE_SYNCED_EVENT = "qalb-account-storage-synced";
export const LS_TIME_TRACKING = "qalb_time_tracking";
export const LS_BOOKMARKS = "qalb_bookmarks";
export const LS_LIBRARY_COLLECTIONS = "qalb_library_collections";

const DEBOUNCE_MS = 1800;
const PULL_PATCH_SUPPRESS_MS = 2800;

let lastPullCompletedAt = 0;
let lastKnownCloudEnabled = null;
const debounceTimers = new Map();

function debounce(namespace, fn) {
  const prev = debounceTimers.get(namespace);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    namespace,
    setTimeout(() => {
      debounceTimers.delete(namespace);
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
  const s = await getSession();
  return Boolean(s?.user?.id);
}

async function getSignedInUserId() {
  const s = await getSession();
  const id = s?.user?.id;
  return typeof id === "string" && id ? id : null;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function shadowNamespaceKey(userId, namespace) {
  return `qalb_user_shadow:${userId}:${namespace}`;
}

function saveShadowPayload(userId, namespace, payload) {
  try {
    localStorage.setItem(shadowNamespaceKey(userId, namespace), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function loadShadowPayload(userId, namespace) {
  return readJson(shadowNamespaceKey(userId, namespace), null);
}

function applyPreferencesFromServer(remotePayload) {
  const localTheme = localStorage.getItem("qalb_theme") === "light" ? "light" : "dark";
  const localScale = normalizeReadingScale(localStorage.getItem(LS_READING_SCALE));
  const localRec = parseInt(localStorage.getItem("qalb_reciter_id") ?? "0", 10);
  const localScript = normalizeQuranScript(localStorage.getItem(LS_QURAN_SCRIPT));
  const localTajweed = parseTajweedPreference(localStorage.getItem(LS_QURAN_TAJWEED));
  const localLiveVideoFit = localStorage.getItem(LS_LIVE_VIDEO_FIT) === "contain" ? "contain" : "cover";
  let localHifzPrefs = null;
  try {
    localHifzPrefs = normalizeHifzPrefs(JSON.parse(localStorage.getItem(LS_HIFZ_PREFS_V1) ?? "null"));
  } catch {
    localHifzPrefs = null;
  }
  const p = mergePreferencesPayload(
    remotePayload,
    localTheme,
    localScale,
    Number.isFinite(localRec) ? localRec : 7,
    localScript,
    localTajweed,
    localLiveVideoFit,
    localHifzPrefs,
  );

  document.documentElement.classList.toggle("light", p.theme === "light");
  localStorage.setItem("qalb_theme", p.theme === "light" ? "light" : "dark");

  const scale = normalizeReadingScale(p.readingScale);
  localStorage.setItem(LS_READING_SCALE, scale);
  applyReadingScaleToDocument(scale);

  localStorage.setItem("qalb_reciter_id", String(p.reciterId));
  localStorage.setItem(LS_QURAN_SCRIPT, normalizeQuranScript(p.quranScript));
  localStorage.setItem(LS_QURAN_TAJWEED, p.tajweedEnabled ? "1" : "0");
  if (p.liveVideoFit === "contain" || p.liveVideoFit === "cover") {
    localStorage.setItem(LS_LIVE_VIDEO_FIT, p.liveVideoFit);
  }
  if (p.hifzPrefs && typeof p.hifzPrefs === "object") {
    localStorage.setItem(LS_HIFZ_PREFS_V1, JSON.stringify(normalizeHifzPrefs(p.hifzPrefs)));
  }
}

/** @param {object | null} payload @param {string} userId */
function applyGoalsLocalFromPayload(payload, userId) {
  if (!payload || typeof payload !== "object") return false;
  let wrote = false;
  if (payload.timeTracking && typeof payload.timeTracking === "object") {
    const localTT = readJson(LS_TIME_TRACKING, {});
    const mergedTT = mergeTimeTracking(payload.timeTracking, localTT);
    localStorage.setItem(LS_TIME_TRACKING, JSON.stringify(mergedTT));
    wrote = true;
  }
  if (Array.isArray(payload.goals)) {
    const localGoals = readJson(LS_GOALS, []);
    const merged = mergeReadingGoals(payload.goals, Array.isArray(localGoals) ? localGoals : []);
    localStorage.setItem(LS_GOALS, JSON.stringify(merged));
    wrote = true;
  }
  if (userId) saveShadowPayload(userId, "goals_local", payload);
  return wrote;
}

/**
 * GET cloud rows and merge into localStorage (remote-first per merge helpers).
 * @returns {Promise<{ cloudEnabled: boolean; wrote: boolean }>}
 */
export async function pullAccountScopedStorageIntoBrowser() {
  if (typeof window === "undefined") return { cloudEnabled: false, wrote: false };

  const session = await getSession();
  if (!session?.user?.id) return { cloudEnabled: false, wrote: false };
  const userId = session.user.id;

  let wrote = false;

  try {
    const [pr, pg, ph, jlisten, jref, jchat, jnotes, jthemes, jgoals, jbm, jcol, jkhatm, jhifz, jdiscover, jdaily, jprayer] =
      await Promise.all([
        fetch("/api/user/app-storage/preferences"),
        fetch("/api/user/app-storage/reading_progress"),
        fetch("/api/user/app-storage/reading_history"),
        fetch("/api/user/app-storage/listen_history"),
        fetch("/api/user/app-storage/verse_reflections"),
        fetch("/api/user/app-storage/verse_chat"),
        fetch("/api/user/app-storage/verse_notes"),
        fetch("/api/user/app-storage/read_key_themes"),
        fetch("/api/user/app-storage/goals_local"),
        fetch("/api/user/app-storage/library_bookmarks"),
        fetch("/api/user/app-storage/library_collections"),
        fetch("/api/user/app-storage/khatm_cycles"),
        fetch("/api/user/app-storage/hifz_progress"),
        fetch("/api/user/app-storage/discover_history"),
        fetch("/api/user/app-storage/daily_letters"),
        fetch("/api/user/app-storage/prayer_log"),
      ]);

    const jp = await pr.json();
    const jg = await pg.json();
    const jh = await ph.json();
    const jListen = await jlisten.json();
    const vref = await jref.json();
    const vchat = await jchat.json();
    const vnotes = await jnotes.json();
    const kthemes = await jthemes.json();
    const goals = await jgoals.json();
    const libBm = await jbm.json();
    const libCol = await jcol.json();
    const jKhatm = await jkhatm.json();
    const jHifz = await jhifz.json();
    const jDiscover = await jdiscover.json();
    const jDaily = await jdaily.json();
    const jPrayer = await jprayer.json();

    const cloudEnabled =
      jp.enabled === true ||
      jg.enabled === true ||
      jh.enabled === true ||
      jListen.enabled === true ||
      vref.enabled === true ||
      vchat.enabled === true ||
      vnotes.enabled === true ||
      kthemes.enabled === true ||
      goals.enabled === true ||
      libBm.enabled === true ||
      libCol.enabled === true ||
      jKhatm.enabled === true ||
      jHifz.enabled === true ||
      jDiscover.enabled === true ||
      jDaily.enabled === true ||
      jPrayer.enabled === true;
    lastKnownCloudEnabled = cloudEnabled;

    if (jp.enabled === true && jp.payload && typeof jp.payload === "object") {
      applyPreferencesFromServer(jp.payload);
      saveShadowPayload(userId, "preferences", jp.payload);
      wrote = true;
    }

    if (jg.enabled === true) {
      const merged = jg.payload && typeof jg.payload === "object" ? mergeReadingProgress(jg.payload, null) : null;
      if (merged) {
        localStorage.setItem(LS_READING_PROGRESS_KEY, JSON.stringify(merged));
        saveShadowPayload(userId, "reading_progress", merged);
      } else {
        localStorage.removeItem(LS_READING_PROGRESS_KEY);
        saveShadowPayload(userId, "reading_progress", null);
      }
      wrote = true;
    }

    if (jh.enabled === true) {
      const payload = jh.payload && typeof jh.payload === "object" ? jh.payload : {};
      const mergedQ = mergeRecentByHref(payload.lastQuranReads, [], MAX_QURAN_LAST_READS);
      const mergedH = mergeRecentByHref(payload.lastHadithReads, [], MAX_LAST_HADITH_READS);
      localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(mergedQ));
      localStorage.setItem(LS_LAST_HADITH_READS, JSON.stringify(mergedH));
      saveShadowPayload(userId, "reading_history", {
        lastQuranReads: mergedQ,
        lastHadithReads: mergedH,
        updatedAt: Date.now(),
      });
      wrote = true;
    }

    if (jListen.enabled === true) {
      const localPayload = loadListenHistoryPayload();
      const remotePayload =
        jListen.payload && typeof jListen.payload === "object" ? jListen.payload : { entries: [] };
      const merged = mergeListenHistoryPayload(remotePayload, localPayload);
      localStorage.setItem(LS_QALB_LISTEN_HISTORY, JSON.stringify(merged));
      saveShadowPayload(userId, "listen_history", merged);
      wrote = true;
    }

    if (vref.enabled === true && vref.payload && typeof vref.payload === "object") {
      const local = readJson(LS_VERSE_REFLECTIONS, {});
      const merged = mergeVerseKeyedBlob(
        vref.payload,
        typeof local === "object" && local && !Array.isArray(local) ? local : {},
      );
      localStorage.setItem(LS_VERSE_REFLECTIONS, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_reflections", merged);
      wrote = true;
    }

    if (vchat.enabled === true && vchat.payload && typeof vchat.payload === "object") {
      const local = readJson(LS_VERSE_CHAT, {});
      const merged = mergeVerseKeyedBlob(
        vchat.payload,
        typeof local === "object" && local && !Array.isArray(local) ? local : {},
      );
      localStorage.setItem(LS_VERSE_CHAT, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_chat", merged);
      wrote = true;
    }

    if (vnotes.enabled === true && vnotes.payload && typeof vnotes.payload === "object") {
      const local = readJson(LS_VERSE_NOTES, {});
      const merged = mergeVerseKeyedBlob(
        vnotes.payload,
        typeof local === "object" && local && !Array.isArray(local) ? local : {},
      );
      localStorage.setItem(LS_VERSE_NOTES, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_notes", merged);
      wrote = true;
    }

    if (kthemes.enabled === true && kthemes.payload && typeof kthemes.payload === "object") {
      const localDoc = readJson(LS_READ_KEY_THEMES, { themesBySurahId: {} });
      const merged = mergeKeyThemesPayload(
        kthemes.payload,
        typeof localDoc === "object" && localDoc ? localDoc : { themesBySurahId: {} },
      );
      localStorage.setItem(LS_READ_KEY_THEMES, JSON.stringify(merged));
      saveShadowPayload(userId, "read_key_themes", merged);
      wrote = true;
    }

    if (goals.enabled === true && goals.payload && typeof goals.payload === "object") {
      if (applyGoalsLocalFromPayload(goals.payload, userId)) wrote = true;
    }

    if (jDiscover.enabled === true && jDiscover.payload && typeof jDiscover.payload === "object") {
      const remoteList = Array.isArray(jDiscover.payload.entries) ? jDiscover.payload.entries : [];
      const localList = readJson(LS_DISCOVER_HISTORY, []);
      const merged = mergeDiscoverHistory(remoteList, Array.isArray(localList) ? localList : []);
      localStorage.setItem(LS_DISCOVER_HISTORY, JSON.stringify(merged));
      saveShadowPayload(userId, "discover_history", jDiscover.payload);
      wrote = true;
    }

    if (jDaily.enabled === true && jDaily.payload && typeof jDaily.payload === "object") {
      const p = jDaily.payload;
      if (typeof p.dayKey === "string" && p.dayKey) {
        localStorage.setItem(LS_DAILY_LETTER_DAY, p.dayKey);
      }
      if (typeof p.text === "string") {
        localStorage.setItem(LS_DAILY_LETTER_TEXT, p.text);
      }
      saveShadowPayload(userId, "daily_letters", p);
      wrote = true;
    }

    if (jPrayer.enabled === true && jPrayer.payload && typeof jPrayer.payload === "object") {
      const p = jPrayer.payload;
      if (p.coords && typeof p.coords === "object") {
        localStorage.setItem(LS_PRAYER_COORDS, JSON.stringify(p.coords));
      }
      if (typeof p.adhanEnabled === "boolean") {
        localStorage.setItem(ADHAN_ENABLED_KEY, p.adhanEnabled ? "1" : "0");
      }
      saveShadowPayload(userId, "prayer_log", p);
      wrote = true;
    }

    if (libBm.enabled === true && libBm.payload && typeof libBm.payload === "object") {
      const localMap = readJson(LS_BOOKMARKS, {});
      const p = libBm.payload;
      const remoteMap =
        p.bookmarks && typeof p.bookmarks === "object" && !Array.isArray(p.bookmarks) ? p.bookmarks : {};
      const mergedBm = mergeBookmarksMap(
        remoteMap,
        typeof localMap === "object" && localMap && !Array.isArray(localMap) ? localMap : {},
      );
      localStorage.setItem(LS_BOOKMARKS, JSON.stringify(mergedBm));
      saveShadowPayload(userId, "library_bookmarks", { bookmarks: mergedBm, updatedAt: Date.now() });
      wrote = true;
    }

    if (libCol.enabled === true && libCol.payload && typeof libCol.payload === "object") {
      const localCol = readJson(LS_LIBRARY_COLLECTIONS, { collections: [], updatedAt: 0 });
      const mergedC = mergeLibraryCollectionsPayload(
        libCol.payload,
        typeof localCol === "object" && localCol ? localCol : { collections: [] },
      );
      localStorage.setItem(LS_LIBRARY_COLLECTIONS, JSON.stringify(mergedC));
      saveShadowPayload(userId, "library_collections", mergedC);
      wrote = true;
    }

    if (jKhatm.enabled === true && jKhatm.payload && typeof jKhatm.payload === "object") {
      const localPages = readJson(LS_KHATM_PAGES_KEY, []);
      const localMilestones = readJson(LS_KHATM_MILESTONES, { overall: [], juz: {} });
      const merged = mergeKhatmPayload(
        jKhatm.payload,
        Array.isArray(localPages) ? localPages : [],
        typeof localMilestones === "object" && localMilestones ? localMilestones : { overall: [], juz: {} },
      );
      localStorage.setItem(LS_KHATM_PAGES_KEY, JSON.stringify(merged.pages));
      localStorage.setItem(LS_KHATM_MILESTONES, JSON.stringify(merged.milestones));
      saveShadowPayload(userId, "khatm_cycles", merged);
      wrote = true;
    }

    if (jHifz.enabled === true && jHifz.payload && typeof jHifz.payload === "object") {
      const localCards = readJson(LS_HIFZ_PROGRESS_KEY, {});
      const merged = mergeHifzCards(
        jHifz.payload,
        typeof localCards === "object" && localCards && !Array.isArray(localCards) ? localCards : {},
      );
      localStorage.setItem(LS_HIFZ_PROGRESS_KEY, JSON.stringify(merged));
      saveShadowPayload(userId, "hifz_progress", { cards: merged, updatedAt: Date.now() });
      wrote = true;
    }

    if (!cloudEnabled) {
      const shadowPreferences = loadShadowPayload(userId, "preferences");
      if (shadowPreferences && typeof shadowPreferences === "object") {
        applyPreferencesFromServer(shadowPreferences);
        wrote = true;
      }
      const shadowProgress = loadShadowPayload(userId, "reading_progress");
      if (shadowProgress && typeof shadowProgress === "object") {
        const merged = mergeReadingProgress(shadowProgress, null);
        if (merged) {
          localStorage.setItem(LS_READING_PROGRESS_KEY, JSON.stringify(merged));
          wrote = true;
        }
      }
      const shadowHistory = loadShadowPayload(userId, "reading_history");
      if (shadowHistory && typeof shadowHistory === "object") {
        const mergedQ = mergeRecentByHref(shadowHistory.lastQuranReads, [], MAX_QURAN_LAST_READS);
        const mergedH = mergeRecentByHref(shadowHistory.lastHadithReads, [], MAX_LAST_HADITH_READS);
        localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(mergedQ));
        localStorage.setItem(LS_LAST_HADITH_READS, JSON.stringify(mergedH));
        wrote = true;
      }
      const shadowListen = loadShadowPayload(userId, "listen_history");
      if (shadowListen && typeof shadowListen === "object") {
        const localPayload = loadListenHistoryPayload();
        const merged = mergeListenHistoryPayload(shadowListen, localPayload);
        localStorage.setItem(LS_QALB_LISTEN_HISTORY, JSON.stringify(merged));
        wrote = true;
      }
      const shadowGoals = loadShadowPayload(userId, "goals_local");
      if (shadowGoals && typeof shadowGoals === "object" && applyGoalsLocalFromPayload(shadowGoals, null)) {
        wrote = true;
      }
      const shadowBm = loadShadowPayload(userId, "library_bookmarks");
      if (shadowBm && typeof shadowBm === "object") {
        const raw = shadowBm.bookmarks && typeof shadowBm.bookmarks === "object" ? shadowBm.bookmarks : shadowBm;
        const localMap = readJson(LS_BOOKMARKS, {});
        const mergedBm = mergeBookmarksMap(
          typeof raw === "object" && raw && !Array.isArray(raw) ? raw : {},
          typeof localMap === "object" && localMap && !Array.isArray(localMap) ? localMap : {},
        );
        localStorage.setItem(LS_BOOKMARKS, JSON.stringify(mergedBm));
        wrote = true;
      }
      const shadowCol = loadShadowPayload(userId, "library_collections");
      if (shadowCol && typeof shadowCol === "object" && Array.isArray(shadowCol.collections)) {
        const localCol = readJson(LS_LIBRARY_COLLECTIONS, { collections: [] });
        const mergedC = mergeLibraryCollectionsPayload(shadowCol, localCol);
        localStorage.setItem(LS_LIBRARY_COLLECTIONS, JSON.stringify(mergedC));
        wrote = true;
      }
    }

    markAccountStoragePullCompleted();
    if (wrote || cloudEnabled) {
      window.dispatchEvent(new CustomEvent(ACCOUNT_STORAGE_SYNCED_EVENT));
    }

    return { cloudEnabled, wrote };
  } catch {
    markAccountStoragePullCompleted();
    return { cloudEnabled: false, wrote };
  }
}

async function patchNamespace(namespace, payload) {
  const userId = await getSignedInUserId();
  if (!userId || shouldSuppressPushAfterPull()) return;
  saveShadowPayload(userId, namespace, payload);
  if (lastKnownCloudEnabled === false) return;
  try {
    const res = await fetch(`/api/user/app-storage/${namespace}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
    if (res.status === 503) {
      lastKnownCloudEnabled = false;
    } else if (res.ok) {
      lastKnownCloudEnabled = true;
    }
  } catch {
    /* ignore */
  }
}

export function schedulePushPreferences() {
  debounce("preferences", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const localTheme = localStorage.getItem("qalb_theme") === "light" ? "light" : "dark";
    const scale = normalizeReadingScale(localStorage.getItem(LS_READING_SCALE));
    const rec = parseInt(localStorage.getItem("qalb_reciter_id") ?? "7", 10);
    const script = normalizeQuranScript(localStorage.getItem(LS_QURAN_SCRIPT));
    const tajweedEnabled = parseTajweedPreference(localStorage.getItem(LS_QURAN_TAJWEED));
    const liveVideoFit = localStorage.getItem(LS_LIVE_VIDEO_FIT) === "contain" ? "contain" : "cover";
    let hifzPrefs = null;
    try {
      hifzPrefs = normalizeHifzPrefs(JSON.parse(localStorage.getItem(LS_HIFZ_PREFS_V1) ?? "null"));
    } catch {
      hifzPrefs = null;
    }
    await patchNamespace("preferences", {
      theme: localTheme,
      readingScale: scale,
      reciterId: Number.isFinite(rec) ? rec : 7,
      quranScript: script,
      tajweedEnabled,
      liveVideoFit,
      ...(hifzPrefs ? { hifzPrefs } : {}),
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushReadingProgress() {
  debounce("reading_progress", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const cur = readJson(LS_READING_PROGRESS_KEY, null);
    if (!cur?.surahId) return;
    await patchNamespace("reading_progress", {
      surahId: cur.surahId,
      verseNum: cur.verseNum ?? 1,
      translationId: cur.translationId ?? 20,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushReadingHistory() {
  debounce("reading_history", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const lastQuranReads = readJson(LS_QALB_LAST_READS, []);
    const lastHadithReads = readJson(LS_LAST_HADITH_READS, []);
    await patchNamespace("reading_history", {
      lastQuranReads: Array.isArray(lastQuranReads) ? lastQuranReads : [],
      lastHadithReads: Array.isArray(lastHadithReads) ? lastHadithReads : [],
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushListenHistory() {
  debounce("listen_history", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const payload = normalizeListenHistoryPayload(loadListenHistoryPayload());
    await patchNamespace("listen_history", payload);
  });
}

export function schedulePushVerseReflections() {
  debounce("verse_reflections", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = readJson(LS_VERSE_REFLECTIONS, {});
    await patchNamespace("verse_reflections", typeof blob === "object" && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushVerseChat() {
  debounce("verse_chat", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = readJson(LS_VERSE_CHAT, {});
    await patchNamespace("verse_chat", typeof blob === "object" && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushVerseNotes() {
  debounce("verse_notes", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = readJson(LS_VERSE_NOTES, {});
    await patchNamespace("verse_notes", typeof blob === "object" && blob && !Array.isArray(blob) ? blob : {});
  });
}

export function schedulePushReadKeyThemes() {
  debounce("read_key_themes", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const doc = readJson(LS_READ_KEY_THEMES, { themesBySurahId: {} });
    const themesBySurahId =
      doc && typeof doc === "object" && doc.themesBySurahId && typeof doc.themesBySurahId === "object"
        ? doc.themesBySurahId
        : {};
    await patchNamespace("read_key_themes", {
      themesBySurahId,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushGoalsLocal() {
  debounce("goals_local", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const timeTracking = readJson(LS_TIME_TRACKING, {});
    const goals = readJson(LS_GOALS, []);
    await patchNamespace("goals_local", {
      timeTracking:
        typeof timeTracking === "object" && timeTracking && !Array.isArray(timeTracking) ? timeTracking : {},
      goals: Array.isArray(goals) ? goals : [],
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushDiscoverHistory() {
  debounce("discover_history", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const entries = readJson(LS_DISCOVER_HISTORY, []);
    await patchNamespace("discover_history", {
      entries: Array.isArray(entries) ? entries : [],
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushDailyLetters() {
  debounce("daily_letters", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const dayKey = localStorage.getItem(LS_DAILY_LETTER_DAY) ?? "";
    const text = localStorage.getItem(LS_DAILY_LETTER_TEXT) ?? "";
    await patchNamespace("daily_letters", {
      dayKey,
      text,
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushPrayerLog() {
  debounce("prayer_log", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    let coords = null;
    try {
      const raw = localStorage.getItem(LS_PRAYER_COORDS);
      if (raw) coords = JSON.parse(raw);
    } catch {
      coords = null;
    }
    await patchNamespace("prayer_log", {
      coords: coords && typeof coords === "object" ? coords : null,
      adhanEnabled: localStorage.getItem(ADHAN_ENABLED_KEY) !== "0",
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushLibraryBookmarks() {
  debounce("library_bookmarks", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const blob = readJson(LS_BOOKMARKS, {});
    await patchNamespace("library_bookmarks", {
      bookmarks: typeof blob === "object" && blob && !Array.isArray(blob) ? blob : {},
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushLibraryCollections() {
  debounce("library_collections", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const doc = readJson(LS_LIBRARY_COLLECTIONS, { collections: [], updatedAt: 0 });
    await patchNamespace("library_collections", {
      collections: Array.isArray(doc.collections) ? doc.collections : [],
      updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : Date.now(),
    });
  });
}

export function schedulePushKhatmProgress() {
  debounce("khatm_cycles", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const pages = readJson(LS_KHATM_PAGES_KEY, []);
    const milestones = readJson(LS_KHATM_MILESTONES, { overall: [], juz: {} });
    await patchNamespace("khatm_cycles", {
      pages: Array.isArray(pages) ? pages : [],
      milestones:
        typeof milestones === "object" && milestones && !Array.isArray(milestones)
          ? milestones
          : { overall: [], juz: {} },
      updatedAt: Date.now(),
    });
  });
}

export function schedulePushHifzProgress() {
  debounce("hifz_progress", async () => {
    if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
    const cards = readJson(LS_HIFZ_PROGRESS_KEY, {});
    await patchNamespace("hifz_progress", {
      cards: typeof cards === "object" && cards && !Array.isArray(cards) ? cards : {},
      updatedAt: Date.now(),
    });
  });
}
