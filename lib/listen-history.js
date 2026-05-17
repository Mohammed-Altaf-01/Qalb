/**
 * Listen page: per-reciter recent surahs with resume position (localStorage + cloud sync).
 * @typedef {{
 *   reciterId: number;
 *   reciterName: string;
 *   surahId: number;
 *   surahName: string;
 *   positionSec: number;
 *   durationSec: number;
 *   updatedAt: number;
 * }} ListenHistoryEntry
 */

export const LS_QALB_LISTEN_HISTORY = "qalb_listen_history_v1";

export const MAX_LISTEN_ENTRIES_PER_RECITER = 5;

/** Minimum saved position (seconds) before we persist. */
export const MIN_LISTEN_POSITION_SEC = 3;

/** Treat as finished when within this many seconds of end. */
export const LISTEN_END_BUFFER_SEC = 15;

/**
 * @param {number} reciterId
 * @param {number} surahId
 */
export function listenEntryKey(reciterId, surahId) {
  return `${reciterId}:${surahId}`;
}

/**
 * @param {ListenHistoryEntry} entry
 * @returns {number} seconds to seek on resume, or 0 to start from beginning
 */
export function resumeStartSec(entry) {
  const pos = Number(entry?.positionSec);
  const dur = Number(entry?.durationSec);
  if (!Number.isFinite(pos) || pos < MIN_LISTEN_POSITION_SEC) return 0;
  if (Number.isFinite(dur) && dur > 0 && pos >= dur - LISTEN_END_BUFFER_SEC) return 0;
  return pos;
}

/**
 * @param {unknown} raw
 * @returns {ListenHistoryEntry | null}
 */
function sanitizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const reciterId = Number(raw.reciterId);
  const surahId = Number(raw.surahId);
  if (!Number.isFinite(reciterId) || !Number.isFinite(surahId)) return null;
  const positionSec = Number(raw.positionSec);
  const durationSec = Number(raw.durationSec);
  const updatedAt = Number(raw.updatedAt);
  return {
    reciterId,
    reciterName: String(raw.reciterName ?? "").trim() || `Reciter ${reciterId}`,
    surahId,
    surahName: String(raw.surahName ?? "").trim() || `Surah ${surahId}`,
    positionSec: Number.isFinite(positionSec) && positionSec >= 0 ? positionSec : 0,
    durationSec: Number.isFinite(durationSec) && durationSec >= 0 ? durationSec : 0,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

/**
 * Apply per-reciter cap (newest first).
 * @param {ListenHistoryEntry[]} entries
 */
export function capListenEntriesPerReciter(entries) {
  const byReciter = new Map();
  for (const e of entries) {
    const list = byReciter.get(e.reciterId) ?? [];
    list.push(e);
    byReciter.set(e.reciterId, list);
  }
  const out = [];
  for (const list of byReciter.values()) {
    const sorted = [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    out.push(...sorted.slice(0, MAX_LISTEN_ENTRIES_PER_RECITER));
  }
  out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return out;
}

/**
 * @param {unknown} payload
 * @returns {{ entries: ListenHistoryEntry[]; updatedAt: number }}
 */
export function normalizeListenHistoryPayload(payload) {
  const raw = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const list = Array.isArray(raw.entries) ? raw.entries : [];
  const byKey = new Map();
  for (const item of list) {
    const e = sanitizeEntry(item);
    if (!e) continue;
    const key = listenEntryKey(e.reciterId, e.surahId);
    const prev = byKey.get(key);
    if (!prev || (e.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) byKey.set(key, e);
  }
  const capped = capListenEntriesPerReciter([...byKey.values()]);
  const updatedAt =
    typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
      ? raw.updatedAt
      : capped[0]?.updatedAt ?? Date.now();
  return { entries: capped, updatedAt };
}

/**
 * @param {ListenHistoryEntry[]} entries
 * @param {Partial<ListenHistoryEntry> & { reciterId: number; surahId: number }} patch
 * @returns {ListenHistoryEntry[]}
 */
export function upsertListenEntry(entries, patch) {
  const base = sanitizeEntry({
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  });
  if (!base) return capListenEntriesPerReciter(entries);

  const key = listenEntryKey(base.reciterId, base.surahId);
  const rest = (Array.isArray(entries) ? entries : []).filter((e) => listenEntryKey(e.reciterId, e.surahId) !== key);
  return capListenEntriesPerReciter([base, ...rest]);
}

/**
 * @param {ListenHistoryEntry[]} entries
 * @param {number} reciterId
 * @returns {ListenHistoryEntry[]}
 */
export function getEntriesForReciter(entries, reciterId) {
  const id = Number(reciterId);
  if (!Number.isFinite(id)) return [];
  return (Array.isArray(entries) ? entries : [])
    .filter((e) => e.reciterId === id)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, MAX_LISTEN_ENTRIES_PER_RECITER);
}

/**
 * @returns {{ entries: ListenHistoryEntry[]; updatedAt: number }}
 */
export function loadListenHistoryPayload() {
  if (typeof window === "undefined") return { entries: [], updatedAt: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(LS_QALB_LISTEN_HISTORY) ?? "{}");
    return normalizeListenHistoryPayload(raw);
  } catch {
    return { entries: [], updatedAt: 0 };
  }
}

/**
 * @param {{ entries: ListenHistoryEntry[]; updatedAt?: number }} payload
 */
export function saveListenHistoryPayload(payload) {
  if (typeof window === "undefined") return;
  const normalized = normalizeListenHistoryPayload({
    ...payload,
    updatedAt: payload.updatedAt ?? Date.now(),
  });
  try {
    localStorage.setItem(LS_QALB_LISTEN_HISTORY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
}
