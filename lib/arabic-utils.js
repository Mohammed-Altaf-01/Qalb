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
