/**
 * First Mushaf page (Madinah print) for each Juz 1–30. Index 0 unused; `juzNum` 1..30.
 */
export const JUZ_FIRST_MUSHAF_PAGE = [
  ,
  /* 0 */
  1,
  22,
  42,
  62,
  82,
  102,
  121,
  141,
  161,
  182,
  201,
  222,
  242,
  262,
  282,
  302,
  322,
  342,
  362,
  382,
  402,
  422,
  442,
  462,
  482,
  502,
  522,
  542,
  562,
  582,
];

export function firstMushafPageForJuz(juzNumber) {
  const j = Number(juzNumber);
  if (!Number.isFinite(j) || j < 1 || j > 30) return 1;
  return JUZ_FIRST_MUSHAF_PAGE[j] ?? 1;
}

/** Last mushaf page for juz 1–30 (Madinah layout; juz 30 ends at 604). */
export function lastMushafPageForJuz(juzNumber) {
  const j = Number(juzNumber);
  if (!Number.isFinite(j) || j < 1 || j > 30) return 604;
  if (j >= 30) return 604;
  const nextFirst = JUZ_FIRST_MUSHAF_PAGE[j + 1];
  return typeof nextFirst === "number" && nextFirst > 1 ? nextFirst - 1 : 604;
}
