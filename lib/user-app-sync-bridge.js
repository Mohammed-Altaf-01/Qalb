/**
 * Client-side sync between Supabase `app_user_storage` (per NextAuth user id) and localStorage.
 * Pull runs after login; pushes are debounced when local state changes.
 */
import { getSession } from "next-auth/react";

import { LS_LAST_HADITH_READS, MAX_LAST_HADITH_READS } from "@/lib/last-hadith-reads";
import {
  mergePreferencesPayload,
  mergeReadingProgress,
  mergeRecentByHref,
} from "@/lib/merge-user-app-storage";
import { LS_QALB_LAST_READS, MAX_QURAN_LAST_READS } from "@/lib/qalb-last-reads";
import { LS_QURAN_SCRIPT, LS_QURAN_TAJWEED, normalizeQuranScript, parseTajweedPreference } from "@/lib/quran-text-preferences";
import { LS_READING_PROGRESS_KEY } from "@/lib/qalb-storage-keys";
import { LS_READING_SCALE, applyReadingScaleToDocument, normalizeReadingScale } from "@/lib/reading-scale";

/** Fired after cloud data is merged into localStorage — home/read/hadith UIs listen to refresh chips. */
export const ACCOUNT_STORAGE_SYNCED_EVENT = "qalb-account-storage-synced";

const DEBOUNCE_MS = 1800;
const PULL_PATCH_SUPPRESS_MS = 2800;

let lastPullCompletedAt = 0;
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

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
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

  let wrote = false;

  try {
    const [pr, pg, ph] = await Promise.all([
      fetch("/api/user/app-storage/preferences"),
      fetch("/api/user/app-storage/reading_progress"),
      fetch("/api/user/app-storage/reading_history"),
    ]);

    const jp = await pr.json();
    const jg = await pg.json();
    const jh = await ph.json();

    const cloudEnabled = jp.enabled === true || jg.enabled === true || jh.enabled === true;

    if (jp.enabled === true && jp.payload && typeof jp.payload === "object") {
      applyPreferencesFromServer(jp.payload);
      wrote = true;
    }

    if (jg.enabled === true && jg.payload && typeof jg.payload === "object") {
      const local = readJson(LS_READING_PROGRESS_KEY, null);
      const merged = mergeReadingProgress(jg.payload, local);
      if (merged) {
        localStorage.setItem(LS_READING_PROGRESS_KEY, JSON.stringify(merged));
        wrote = true;
      }
    }

    if (jh.enabled === true && jh.payload && typeof jh.payload === "object") {
      const localQ = readJson(LS_QALB_LAST_READS, []);
      const localH = readJson(LS_LAST_HADITH_READS, []);
      const mergedQ = mergeRecentByHref(jh.payload.lastQuranReads, localQ, MAX_QURAN_LAST_READS);
      const mergedH = mergeRecentByHref(jh.payload.lastHadithReads, localH, MAX_LAST_HADITH_READS);
      localStorage.setItem(LS_QALB_LAST_READS, JSON.stringify(mergedQ));
      localStorage.setItem(LS_LAST_HADITH_READS, JSON.stringify(mergedH));
      wrote = true;
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
  if (!(await isSignedIn()) || shouldSuppressPushAfterPull()) return;
  try {
    await fetch(`/api/user/app-storage/${namespace}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
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
