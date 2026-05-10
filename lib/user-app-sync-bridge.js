/**
 * Client-side sync between Supabase `app_user_storage` (per NextAuth user id) and localStorage.
 * Pull runs after login; pushes are debounced when local state changes.
 */
import { getSession } from "next-auth/react";

import { LS_LAST_HADITH_READS, MAX_LAST_HADITH_READS } from "@/lib/last-hadith-reads";
import {
  mergeKeyThemesPayload,
  mergePreferencesPayload,
  mergeReadingProgress,
  mergeRecentByHref,
  mergeTimeTracking,
  mergeVerseKeyedBlob,
} from "@/lib/merge-user-app-storage";
import { LS_QALB_LAST_READS, MAX_QURAN_LAST_READS } from "@/lib/qalb-last-reads";
import { LS_READ_KEY_THEMES, LS_READING_PROGRESS_KEY } from "@/lib/qalb-storage-keys";
import { LS_VERSE_CHAT, LS_VERSE_NOTES, LS_VERSE_REFLECTIONS } from "@/lib/qalb-verse-local-keys";
import { LS_QURAN_SCRIPT, LS_QURAN_TAJWEED, normalizeQuranScript, parseTajweedPreference } from "@/lib/quran-text-preferences";
import { LS_READING_SCALE, applyReadingScaleToDocument, normalizeReadingScale } from "@/lib/reading-scale";

/** Fired after cloud data is merged into localStorage — home/read/hadith UIs listen to refresh chips. */
export const ACCOUNT_STORAGE_SYNCED_EVENT = "qalb-account-storage-synced";
export const LS_TIME_TRACKING = "qalb_time_tracking";

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
  const p = mergePreferencesPayload(
    remotePayload,
    localTheme,
    localScale,
    Number.isFinite(localRec) ? localRec : 7,
    localScript,
    localTajweed,
  );

  document.documentElement.classList.toggle("light", p.theme === "light");
  localStorage.setItem("qalb_theme", p.theme === "light" ? "light" : "dark");

  const scale = normalizeReadingScale(p.readingScale);
  localStorage.setItem(LS_READING_SCALE, scale);
  applyReadingScaleToDocument(scale);

  localStorage.setItem("qalb_reciter_id", String(p.reciterId));
  localStorage.setItem(LS_QURAN_SCRIPT, normalizeQuranScript(p.quranScript));
  localStorage.setItem(LS_QURAN_TAJWEED, p.tajweedEnabled ? "1" : "0");
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
    const [pr, pg, ph, jref, jchat, jnotes, jthemes, jgoals] = await Promise.all([
      fetch("/api/user/app-storage/preferences"),
      fetch("/api/user/app-storage/reading_progress"),
      fetch("/api/user/app-storage/reading_history"),
      fetch("/api/user/app-storage/verse_reflections"),
      fetch("/api/user/app-storage/verse_chat"),
      fetch("/api/user/app-storage/verse_notes"),
      fetch("/api/user/app-storage/read_key_themes"),
      fetch("/api/user/app-storage/goals_local"),
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

    if (vref.enabled === true && vref.payload && typeof vref.payload === "object") {
      const local = readJson(LS_VERSE_REFLECTIONS, {});
      const merged = mergeVerseKeyedBlob(vref.payload, typeof local === "object" && local && !Array.isArray(local) ? local : {});
      localStorage.setItem(LS_VERSE_REFLECTIONS, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_reflections", merged);
      wrote = true;
    }

    if (vchat.enabled === true && vchat.payload && typeof vchat.payload === "object") {
      const local = readJson(LS_VERSE_CHAT, {});
      const merged = mergeVerseKeyedBlob(vchat.payload, typeof local === "object" && local && !Array.isArray(local) ? local : {});
      localStorage.setItem(LS_VERSE_CHAT, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_chat", merged);
      wrote = true;
    }

    if (vnotes.enabled === true && vnotes.payload && typeof vnotes.payload === "object") {
      const local = readJson(LS_VERSE_NOTES, {});
      const merged = mergeVerseKeyedBlob(vnotes.payload, typeof local === "object" && local && !Array.isArray(local) ? local : {});
      localStorage.setItem(LS_VERSE_NOTES, JSON.stringify(merged));
      saveShadowPayload(userId, "verse_notes", merged);
      wrote = true;
    }

    if (kthemes.enabled === true && kthemes.payload && typeof kthemes.payload === "object") {
      const localDoc = readJson(LS_READ_KEY_THEMES, { themesBySurahId: {} });
      const merged = mergeKeyThemesPayload(kthemes.payload, typeof localDoc === "object" && localDoc ? localDoc : { themesBySurahId: {} });
      localStorage.setItem(LS_READ_KEY_THEMES, JSON.stringify(merged));
      saveShadowPayload(userId, "read_key_themes", merged);
      wrote = true;
    }

    if (goals.enabled === true && goals.payload && typeof goals.payload === "object") {
      const payload = goals.payload.timeTracking;
      if (payload && typeof payload === "object") {
        const localTT = readJson(LS_TIME_TRACKING, {});
        const mergedTT = mergeTimeTracking(payload, localTT);
        localStorage.setItem(LS_TIME_TRACKING, JSON.stringify(mergedTT));
        wrote = true;
      }
      saveShadowPayload(userId, "goals_local", goals.payload);
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
      const shadowGoals = loadShadowPayload(userId, "goals_local");
      if (shadowGoals?.timeTracking && typeof shadowGoals.timeTracking === "object") {
        const localTT = readJson(LS_TIME_TRACKING, {});
        const mergedTT = mergeTimeTracking(shadowGoals.timeTracking, localTT);
        localStorage.setItem(LS_TIME_TRACKING, JSON.stringify(mergedTT));
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
    await patchNamespace("preferences", {
      theme: localTheme,
      readingScale: scale,
      reciterId: Number.isFinite(rec) ? rec : 7,
      quranScript: script,
      tajweedEnabled,
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
    await patchNamespace("goals_local", {
      timeTracking: typeof timeTracking === "object" && timeTracking && !Array.isArray(timeTracking) ? timeTracking : {},
      updatedAt: Date.now(),
    });
  });
}
