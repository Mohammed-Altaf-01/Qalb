export const LS_QURAN_SCRIPT = "qalb_quran_script";
export const LS_QURAN_TAJWEED = "qalb_quran_tajweed";

export const QURAN_SCRIPTS = {
  UTHMANI: "uthmani",
  INDOPAK: "indopak",
};

export function normalizeQuranScript(value) {
  return value === QURAN_SCRIPTS.INDOPAK ? QURAN_SCRIPTS.INDOPAK : QURAN_SCRIPTS.UTHMANI;
}

export function parseTajweedPreference(value) {
  return value === "1" || value === "true";
}
