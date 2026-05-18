/**
 * Same logic as web lib/hadith-catalog.js splitHadithSanad (no Node fs).
 * @param {string} text
 * @param {'en' | 'ar'} lang
 */
export function splitHadithSanad(text, lang = "en") {
  const source = String(text ?? "").trim();
  if (!source) return { sanad: null, body: "" };
  if (lang === "ar") {
    const m = source.match(/^(.*?)(?:(?:قال|فقال|أن)\s)/u);
    if (m && m[1] && m[1].length > 12) {
      const sanad = m[1].trim();
      return { sanad, body: source.slice(sanad.length).trim() || source };
    }
    return { sanad: null, body: source };
  }
  const m = source.match(/^(.*?)(?::|-)\s+/);
  if (m && m[1] && /(narrated|reported|heard|from)/i.test(m[1])) {
    const sanad = m[1].trim();
    return { sanad, body: source.slice(m[0].length).trim() || source };
  }
  return { sanad: null, body: source };
}

/** Same as web `formatHadithGrades` in lib/hadith-catalog.js */
export function formatHadithGrades(grades) {
  if (!Array.isArray(grades) || grades.length === 0) return "";
  return grades
    .map((g) => {
      if (g == null) return "";
      if (typeof g === "string") return g.trim();
      if (typeof g === "object") {
        const grade = String(g.grade ?? g.label ?? "").trim();
        const name = String(g.name ?? g.graded_by ?? "").trim();
        if (grade && name) return `${grade} (${name})`;
        return grade || name;
      }
      return String(g).trim();
    })
    .filter(Boolean)
    .join(" · ");
}
