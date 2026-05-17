/**
 * Pure merge helpers: server payload + current localStorage-backed lists.
 * Remote order wins; local-only rows are appended (deduped by href).
 */

/** @typedef {{ href: string }} HrefKeyed */

export function mergeRecentByHref(remoteList, localList, maxItems) {
  const remote = Array.isArray(remoteList) ? remoteList : [];
  const local = Array.isArray(localList) ? localList : [];
  const seen = new Set();
  const out = [];
  for (const item of [...remote, ...local]) {
    const href = item?.href;
    if (typeof href !== "string" || !href || seen.has(href)) continue;
    seen.add(href);
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

/**
 * @param {object | null} remote
 * @param {object | null} localObj — current qalb_reading_progress shape
 */
export function mergeReadingProgress(remote, localObj) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : null;
  const l = localObj && typeof localObj === "object" ? localObj : null;
  const rTs = typeof r?.updatedAt === "number" ? r.updatedAt : 0;
  const lTs = typeof l?.updatedAt === "number" ? l.updatedAt : 0;
  if (r && r.surahId != null && rTs >= lTs) {
    return {
      surahId: Number(r.surahId),
      verseNum: r.verseNum != null ? Number(r.verseNum) : 1,
      translationId: r.translationId != null ? Number(r.translationId) : 20,
      updatedAt: rTs || Date.now(),
    };
  }
  if (l && l.surahId != null) {
    return {
      surahId: Number(l.surahId),
      verseNum: l.verseNum != null ? Number(l.verseNum) : 1,
      translationId: l.translationId != null ? Number(l.translationId) : 20,
      updatedAt: lTs || Date.now(),
    };
  }
  return null;
}

/**
 * @param {object | null} remote
 * @param {string} localTheme — 'light' | 'dark' from qalb_theme
 */
export function mergePreferencesPayload(remote, localTheme, localScale, localReciter, localScript, localTajweed) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const theme =
    r.theme === "light" || r.theme === "dark"
      ? r.theme
      : localTheme === "light" || localTheme === "dark"
        ? localTheme
        : "dark";
  const readingScale = typeof r.readingScale === "string" ? r.readingScale : localScale;
  const reciterId =
    typeof r.reciterId === "number" && Number.isFinite(r.reciterId)
      ? r.reciterId
      : typeof localReciter === "number"
        ? localReciter
        : 7;
  const quranScript = r.quranScript === "indopak" ? "indopak" : localScript === "indopak" ? "indopak" : "uthmani";
  const tajweedEnabled =
    typeof r.tajweedEnabled === "boolean" ? r.tajweedEnabled : typeof localTajweed === "boolean" ? localTajweed : false;
  return {
    theme,
    readingScale: readingScale || "comfortable",
    reciterId,
    quranScript,
    tajweedEnabled,
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
  };
}

function noteSavedAtMs(value) {
  if (!value || typeof value !== "object") return 0;
  const s = value.savedAt;
  if (typeof s !== "string") return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Merge verse-keyed blobs (reflections = string[] per verse, chat = message[] per verse, notes = { text, savedAt }).
 * Prefers the "richer" side for arrays (longer = more history); for notes, newer savedAt wins; tie → remote.
 * @param {object | null} remote
 * @param {object | null} local
 */
export function mergeVerseKeyedBlob(remote, local) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const l = local && typeof local === "object" && !Array.isArray(local) ? local : {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l)]);
  const out = {};
  for (const k of keys) {
    const rv = r[k];
    const lv = l[k];
    if (rv == null) {
      out[k] = lv;
      continue;
    }
    if (lv == null) {
      out[k] = rv;
      continue;
    }
    if (Array.isArray(rv) && Array.isArray(lv)) {
      out[k] = lv.length > rv.length ? lv : rv.length > lv.length ? rv : rv;
      continue;
    }
    if (
      typeof rv === "object" &&
      !Array.isArray(rv) &&
      typeof lv === "object" &&
      !Array.isArray(lv) &&
      ("savedAt" in rv || "savedAt" in lv)
    ) {
      out[k] = noteSavedAtMs(lv) > noteSavedAtMs(rv) ? lv : rv;
      continue;
    }
    out[k] = rv;
  }
  return out;
}

/**
 * @param {object | null} remote
 * @param {object | null} local — same shape: { themesBySurahId: Record<string, { markdown, updatedAt, surahName? }> }
 */
/**
 * Merge `qalb_time_tracking`-shaped payloads from cloud and device (per-day max avoids double-counting same calendar day).
 */
/**
 * Merge `qalb_bookmarks` maps `{ [verseKey]: { verseKey, bookmarkedAt, ... } }`.
 */
export function mergeBookmarksMap(remote, local) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const l = local && typeof local === "object" && !Array.isArray(local) ? local : {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l)]);
  const out = {};
  for (const k of keys) {
    const rv = r[k];
    const lv = l[k];
    if (!rv || typeof rv !== "object") {
      if (lv && typeof lv === "object") out[k] = lv;
      continue;
    }
    if (!lv || typeof lv !== "object") {
      out[k] = rv;
      continue;
    }
    const rt = Date.parse(rv.bookmarkedAt ?? "") || 0;
    const lt = Date.parse(lv.bookmarkedAt ?? "") || 0;
    out[k] = lt >= rt ? lv : rv;
  }
  return out;
}

/**
 * Merge `{ collections: [{ id, name, verses, updatedAt }] }`.
 */
export function mergeLibraryCollectionsPayload(remote, local) {
  const rList = remote?.collections;
  const lList = local?.collections;
  const r = Array.isArray(rList) ? rList : [];
  const l = Array.isArray(lList) ? lList : [];
  const byId = new Map();

  function score(c) {
    const u = typeof c?.updatedAt === "number" ? c.updatedAt : 0;
    const n = Array.isArray(c?.verses) ? c.verses.length : 0;
    return u * 1e6 + n;
  }

  for (const c of [...r, ...l]) {
    const id = c?.id != null ? String(c.id) : "";
    if (!id || typeof c?.name !== "string") continue;
    const prev = byId.get(id);
    if (!prev || score(c) >= score(prev)) byId.set(id, { ...c, id });
  }

  const collections = [...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const maxU = Math.max(
    typeof remote?.updatedAt === "number" ? remote.updatedAt : 0,
    typeof local?.updatedAt === "number" ? local.updatedAt : 0,
  );
  return { collections, updatedAt: maxU || Date.now() };
}

export function mergeTimeTracking(remote, local) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const l = local && typeof local === "object" && !Array.isArray(local) ? local : {};
  const rBy = r.byDay && typeof r.byDay === "object" ? r.byDay : {};
  const lBy = l.byDay && typeof l.byDay === "object" ? l.byDay : {};
  const keys = new Set([...Object.keys(rBy), ...Object.keys(lBy)]);
  const byDay = {};
  for (const k of keys) {
    const a = Number(rBy[k]);
    const b = Number(lBy[k]);
    const mr = Number.isFinite(a) ? a : 0;
    const ml = Number.isFinite(b) ? b : 0;
    const m = Math.max(mr, ml);
    if (m > 0) byDay[k] = m;
  }
  let totalMinutes = Object.values(byDay).reduce((sum, v) => sum + Number(v), 0);
  const rTot = Number(r.totalMinutes);
  const lTot = Number(l.totalMinutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    totalMinutes = Math.max(Number.isFinite(rTot) ? rTot : 0, Number.isFinite(lTot) ? lTot : 0);
  }
  const updatedAt = Math.max(
    typeof r.updatedAt === "number" ? r.updatedAt : 0,
    typeof l.updatedAt === "number" ? l.updatedAt : 0,
  );
  return { byDay, totalMinutes, updatedAt: updatedAt || Date.now() };
}

/**
 * @param {object | null} remote — `{ pages: number[], milestones?: { overall, juz } }`
 * @param {number[]} localPages
 * @param {object | null} localMilestones
 */
export function mergeKhatmPayload(remote, localPages, localMilestones) {
  const r = remote && typeof remote === "object" && !Array.isArray(remote) ? remote : {};
  const rPages = Array.isArray(r.pages) ? r.pages : [];
  const lPages = Array.isArray(localPages) ? localPages : [];
  const pages = [...new Set([...rPages, ...lPages])]
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 604)
    .map((n) => Math.floor(n))
    .sort((a, b) => a - b);

  const thresholds = [30, 50, 100];
  const mergeThresholdList = (a, b) =>
    [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])].filter((n) =>
      thresholds.includes(n),
    );

  const rM = r.milestones && typeof r.milestones === "object" ? r.milestones : {};
  const lM = localMilestones && typeof localMilestones === "object" ? localMilestones : {};
  const overall = mergeThresholdList(rM.overall, lM.overall).sort((a, b) => a - b);
  const juz = {};
  const juzKeys = new Set([...Object.keys(rM.juz ?? {}), ...Object.keys(lM.juz ?? {})]);
  for (const k of juzKeys) {
    juz[k] = mergeThresholdList(rM.juz?.[k], lM.juz?.[k]).sort((a, b) => a - b);
  }

  const updatedAt = Math.max(
    typeof r.updatedAt === "number" ? r.updatedAt : 0,
    typeof lM.updatedAt === "number" ? lM.updatedAt : 0,
    Date.now(),
  );
  return { pages, milestones: { overall, juz }, updatedAt };
}

/**
 * @param {object | null} remote — `{ cards: Record<string, object> }`
 * @param {object | null} localCards
 */
export function mergeHifzCards(remote, localCards) {
  const r = remote?.cards && typeof remote.cards === "object" && !Array.isArray(remote.cards) ? remote.cards : {};
  const l = localCards && typeof localCards === "object" && !Array.isArray(localCards) ? localCards : {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l)]);
  const cards = {};
  for (const k of keys) {
    const rv = r[k];
    const lv = l[k];
    if (!rv || typeof rv !== "object") {
      if (lv && typeof lv === "object") cards[k] = lv;
      continue;
    }
    if (!lv || typeof lv !== "object") {
      cards[k] = rv;
      continue;
    }
    const rt = typeof rv.updatedAt === "number" ? rv.updatedAt : 0;
    const lt = typeof lv.updatedAt === "number" ? lv.updatedAt : 0;
    cards[k] = lt >= rt ? lv : rv;
  }
  return cards;
}

export function mergeKeyThemesPayload(remote, local) {
  const r = remote?.themesBySurahId && typeof remote.themesBySurahId === "object" ? remote.themesBySurahId : {};
  const l = local?.themesBySurahId && typeof local.themesBySurahId === "object" ? local.themesBySurahId : {};
  const keys = new Set([...Object.keys(r), ...Object.keys(l)]);
  const themesBySurahId = {};
  for (const k of keys) {
    const a = r[k];
    const b = l[k];
    const aTs = typeof a?.updatedAt === "number" ? a.updatedAt : 0;
    const bTs = typeof b?.updatedAt === "number" ? b.updatedAt : 0;
    if (aTs >= bTs && typeof a?.markdown === "string" && a.markdown.length > 0) {
      themesBySurahId[k] = a;
    } else if (typeof b?.markdown === "string" && b.markdown.length > 0) {
      themesBySurahId[k] = b;
    }
  }
  return { themesBySurahId, updatedAt: Date.now() };
}
