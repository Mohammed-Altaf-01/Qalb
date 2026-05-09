/**
 * Removes inline numeric footnote markers from translation text, e.g.
 * "through whom1 you ask one another,2" => "through whom you ask one another,"
 */
export function cleanTranslationText(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  return text
    .replace(/([A-Za-z)\],.;:!?])\d+(?=\s|$)/g, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
