/**
 * Khatm (mushaf page) progress — localStorage + juz aggregates.
 */
import { firstMushafPageForJuz, lastMushafPageForJuz } from "@/lib/juz-mushaf-start-page";
import { checkKhatmMilestones } from "@/lib/khatm-milestones";

export const LS_KHATM_PAGES = "qalb_khatm_pages_v1";
export const KHATM_UPDATED_EVENT = "qalb_khatm_updated";
export const MUSHAF_PAGE_COUNT = 604;

/**
 * @param {Iterable<number>} pages
 * @returns {number[]}
 */
export function normalizeKhatmPages(pages) {
  const out = [];
  for (const p of pages) {
    const n = Number(p);
    if (Number.isFinite(n) && n >= 1 && n <= MUSHAF_PAGE_COUNT) out.push(Math.floor(n));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * @returns {Set<number>}
 */
export function loadKhatmPages() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KHATM_PAGES) ?? "[]");
    return new Set(normalizeKhatmPages(Array.isArray(raw) ? raw : []));
  } catch {
    return new Set();
  }
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const p of a) {
    if (!b.has(p)) return false;
  }
  return true;
}

/**
 * @param {Set<number>} pages
 */
export function saveKhatmPages(pages) {
  if (typeof window === "undefined") return;
  const prev = loadKhatmPages();
  const nextSet = new Set(normalizeKhatmPages(pages));
  if (setsEqual(prev, nextSet)) return;

  const before = getKhatmStats(prev);
  try {
    localStorage.setItem(LS_KHATM_PAGES, JSON.stringify([...nextSet].sort((a, b) => a - b)));
    window.dispatchEvent(new Event(KHATM_UPDATED_EVENT));
  } catch {
    return;
  }
  const after = getKhatmStats(nextSet);
  checkKhatmMilestones(before, after);
  void import("@/lib/user-app-sync-bridge").then((m) => m.schedulePushKhatmProgress());
}

/**
 * @param {number} page
 * @returns {boolean} true if newly marked
 */
export function markKhatmPage(page) {
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1 || n > MUSHAF_PAGE_COUNT) return false;
  const p = Math.floor(n);
  const set = loadKhatmPages();
  if (set.has(p)) return false;
  set.add(p);
  saveKhatmPages(set);
  return true;
}

/**
 * @param {number} juzNum
 * @param {Set<number>} readPages
 */
export function juzPageStats(juzNum, readPages) {
  const first = firstMushafPageForJuz(juzNum);
  const last = lastMushafPageForJuz(juzNum);
  let done = 0;
  const total = last - first + 1;
  for (let p = first; p <= last; p += 1) {
    if (readPages.has(p)) done += 1;
  }
  const pct = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
  return { num: juzNum, firstPage: first, lastPage: last, done, total, pct };
}

/**
 * @param {Set<number>} readPages
 */
export function firstUnreadPageInJuz(juzNum, readPages) {
  const { firstPage, lastPage } = juzPageStats(juzNum, readPages);
  for (let p = firstPage; p <= lastPage; p += 1) {
    if (!readPages.has(p)) return p;
  }
  return firstPage;
}

/**
 * @param {Set<number>} readPages
 */
export function getKhatmStats(readPages) {
  const done = readPages.size;
  const overallPct = Math.round((done / MUSHAF_PAGE_COUNT) * 1000) / 10;
  const juzs = [];
  for (let j = 1; j <= 30; j += 1) {
    juzs.push(juzPageStats(j, readPages));
  }
  return { done, total: MUSHAF_PAGE_COUNT, overallPct, juzs };
}
