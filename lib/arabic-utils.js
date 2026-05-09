/**
 * Strips the ornate verse-number marker appended by the Quran Foundation API
 * to text_uthmani strings, e.g. "…وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ ﴿٢٥٥﴾" → "…وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ"
 *
 * The marker uses ornate brackets U+FD3E / U+FD3F and Arabic-Indic or
 * Extended Arabic-Indic digits (U+0660–U+0669, U+06F0–U+06F9).
 */
export function stripVerseEndMarker(text) {
  return text.replace(/\s*[﴿﴾][\u0660-\u0669\u06F0-\u06F9]+[﴿﴾]\s*$/, "").trimEnd();
}

/**
 * Filters out end-of-verse token words returned by the Quran Foundation words API.
 * These have char_type_name === "end" and represent the verse number ornament,
 * not actual Quranic text.
 */
export function filterVerseWords(words) {
  return (words ?? []).filter((w) => w.char_type_name !== "end");
}

/** @param {string} verseKey e.g. "2:255" */
export function verseNumberFromKey(verseKey) {
  if (!verseKey || typeof verseKey !== "string") return null;
  const parts = verseKey.split(":");
  if (parts.length < 2) return null;
  const n = parseInt(parts[1], 10);
  return Number.isFinite(n) ? n : null;
}

const WESTERN_TO_ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/**
 * Converts a non-negative integer (or numeric string) to Eastern Arabic-Indic digits for ayah markers.
 * @param {number|string} n
 */
export function toArabicIndicDigits(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return "";
  const s = String(Math.floor(num));
  let out = "";
  for (const ch of s) {
    const d = ch.charCodeAt(0) - 48;
    if (d >= 0 && d <= 9) out += WESTERN_TO_ARABIC_INDIC[d];
    else out += ch;
  }
  return out;
}
