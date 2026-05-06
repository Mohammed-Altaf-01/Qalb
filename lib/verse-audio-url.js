/**
 * Turn Quran Foundation `audio_files[].url` into a browser-playable absolute URL.
 * Upstream often returns protocol-relative hosts (`//mirrors.quranicaudio.com/...`)
 * or paths meant for `verses.quran.com`.
 */
export function normalizeVerseAudioUrl(raw, cdnBase = "https://verses.quran.com") {
  if (raw == null || typeof raw !== "string") return "";
  const path = raw.trim();
  if (!path) return "";
  if (path.startsWith("https://") || path.startsWith("http://")) return path;
  if (path.startsWith("//")) return `https:${path}`;
  const withoutLeadSlashes = path.replace(/^\/+/, "");
  return `${cdnBase.replace(/\/+$/, "")}/${withoutLeadSlashes}`;
}
