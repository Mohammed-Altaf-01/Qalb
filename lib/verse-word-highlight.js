/**
 * Word-by-word verse audio highlighting (segment timestamps from Quran Foundation).
 * Shared by Read and VerseCard.
 */

/**
 * @param {number} currentMs
 * @param {Array<[unknown, number, number, number]>|null|undefined} segments
 * @returns {number} Zero-based word index, or -1
 */
export function findActiveWord(currentMs, segments) {
  if (!segments?.length) return -1;
  for (const seg of segments) {
    const wordPos = seg[1];
    const startMs = seg[2];
    const endMs = seg[3];
    if (currentMs >= startMs && currentMs < endMs) return wordPos - 1;
  }
  return -1;
}

/**
 * @param {{ position?: number }} word
 * @param {number} index — index in filtered words array
 * @param {number} activeWordIdx — from findActiveWord
 */
export function wordHighlightIndex(word, index, activeWordIdx) {
  return activeWordIdx === (word.position ?? index + 1) - 1;
}
