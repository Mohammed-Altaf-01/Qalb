import { preferredMoshafEntry } from "@/lib/mp3quran-moshaf";

/**
 * @param {Array<any>} reciters
 * @returns {Array<{ id: number, name: string, server: string, surahIds: number[] }>}
 */
export function parseMp3QuranReciters(reciters) {
  const raw = Array.isArray(reciters) ? reciters : [];
  return raw
    .map((r) => {
      if (r?.server != null && Array.isArray(r.surahIds)) {
        let server = String(r.server ?? "").trim();
        if (!server) return null;
        server = server.endsWith("/") ? server : `${server}/`;
        const surahIds = r.surahIds.filter((n) => Number.isFinite(n) && n >= 1 && n <= 114).sort((a, b) => a - b);
        return {
          id: Number(r?.id),
          name: String(r?.name ?? "").trim(),
          server,
          surahIds,
        };
      }
      const moshaf = Array.isArray(r?.moshaf) ? r.moshaf : [];
      const preferred = preferredMoshafEntry(moshaf);
      let server = String(preferred?.server ?? "").trim();
      const surahIds = Array.from(
        new Set(
          String(preferred?.surah_list ?? "")
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= 114),
        ),
      ).sort((a, b) => a - b);
      server = server.endsWith("/") ? server : `${server}/`;
      return {
        id: Number(r?.id),
        name: String(r?.name ?? "").trim(),
        server,
        surahIds,
      };
    })
    .filter((r) => r && Number.isFinite(r.id) && r.name && r.server && r.surahIds.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {string} streamUrl
 * @returns {string}
 */
export function deriveListenServerFromStreamUrl(streamUrl) {
  if (typeof streamUrl !== "string" || !streamUrl) return "";
  return streamUrl.replace(/\/\d{3}\.mp3(?:\?.*)?$/i, "/");
}

/**
 * @param {Array<{ id: number, name: string, server: string, surahIds: number[] }>} parsedReciters
 * @param {{ reciterId?: number | null, reciterName?: string, server?: string, streamUrl?: string }} player
 * @returns {{ id: number, name: string, server: string, surahIds: number[] } | null}
 */
export function findListenReciter(parsedReciters, player) {
  if (!parsedReciters.length) return null;
  if (player.reciterId != null) {
    const byId = parsedReciters.find((r) => r.id === player.reciterId);
    if (byId) return byId;
  }
  const name = String(player.reciterName ?? "").trim();
  if (name) {
    const byName = parsedReciters.find((r) => r.name === name);
    if (byName) return byName;
  }
  const server = String(player.server ?? "").trim() || deriveListenServerFromStreamUrl(player.streamUrl ?? "");
  if (server) {
    const normalized = server.endsWith("/") ? server : `${server}/`;
    const byServer = parsedReciters.find((r) => r.server === normalized || normalized.startsWith(r.server));
    if (byServer) return byServer;
  }
  return null;
}

/**
 * @param {Array<{ id: number, name_simple: string }>} chapters
 * @param {{ surahIds: number[] }} reciter
 * @returns {Array<{ id: number, name_simple: string }>}
 */
export function getPlayableListenSurahs(chapters, reciter) {
  const allowed = new Set(reciter.surahIds);
  return (chapters ?? []).filter((c) => allowed.has(c.id));
}
