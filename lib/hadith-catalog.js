/**
 * Local catalog of hadith books (section index from fawazahmed0/hadith-api English editions).
 * Section hadith text is loaded at runtime from the CDN (see fetchHadithSection).
 */
import fs from "node:fs";
import path from "node:path";

const SECTIONS_DIR = path.join(process.cwd(), "lib", "data", "hadith-sections");

/** @typedef {{ slug: string; edition: string; name: string; sectionCount: number }} HadithBookSummary */

/**
 * @returns {HadithBookSummary[]}
 */
export function listHadithBooks() {
  if (!fs.existsSync(SECTIONS_DIR)) return [];
  const files = fs.readdirSync(SECTIONS_DIR).filter((f) => f.endsWith(".json") && f.startsWith("eng-"));
  const books = [];
  for (const file of files.sort()) {
    const raw = fs.readFileSync(path.join(SECTIONS_DIR, file), "utf8");
    const data = JSON.parse(raw);
    const slug = data.book;
    const sections = data.sections ?? {};
    const keys = Object.keys(sections).filter((k) => k !== "0" && sections[k]);
    books.push({
      slug,
      edition: data.edition,
      name: data.name ?? slug,
      sectionCount: keys.length,
    });
  }
  return books;
}

/**
 * @param {string} slug — e.g. bukhari
 * @returns {{ edition: string; name: string; chapters: { id: string; title: string; hadithFirst: number; hadithLast: number }[] } | null}
 */
export function getHadithChaptersForBook(slug) {
  if (!slug || !/^[a-z]+$/.test(slug)) return null;
  const file = path.join(SECTIONS_DIR, `eng-${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const sections = data.sections ?? {};
  const details = data.section_details ?? {};
  const chapters = [];
  for (const id of Object.keys(sections).sort((a, b) => Number(a) - Number(b))) {
    if (id === "0" || !sections[id]) continue;
    const d = details[id];
    chapters.push({
      id,
      title: sections[id],
      hadithFirst: d?.hadithnumber_first ?? 0,
      hadithLast: d?.hadithnumber_last ?? 0,
    });
  }
  return {
    edition: data.edition,
    name: data.name ?? slug,
    chapters,
  };
}

const CDN_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

/**
 * Fetch hadiths for one section from the public CDN (English edition).
 * @param {string} edition — e.g. eng-bukhari
 * @param {string|number} sectionId
 * @returns {Promise<object | null>}
 */
export async function fetchHadithSection(edition, sectionId) {
  if (!edition || !/^(eng|ara)-[a-z]+$/.test(edition)) return null;
  const sid = String(sectionId);
  if (!/^\d+$/.test(sid)) return null;

  const minUrl = `${CDN_BASE}/${edition}/sections/${sid}.min.json`;
  const fullUrl = `${CDN_BASE}/${edition}/sections/${sid}.json`;

  let res = await fetch(minUrl, { next: { revalidate: 86_400 } });
  if (!res.ok) res = await fetch(fullUrl, { next: { revalidate: 86_400 } });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Attach parallel Arabic narration text keyed by canonical hadithnumber (CDN eng-* vs ara-*).
 * @param {Array<{ hadithnumber: number; text: string }>} englishHadiths
 * @param {object | null} arabicPayload — same schema as fetchHadithSection for ara-*
 */
export function attachArabicToHadiths(englishHadiths, arabicPayload) {
  if (!arabicPayload?.hadiths?.length) {
    return englishHadiths.map((h) => ({ ...h, textArabic: null }));
  }
  const map = new Map(arabicPayload.hadiths.map((h) => [h.hadithnumber, h.text]));
  return englishHadiths.map((h) => ({ ...h, textArabic: map.get(h.hadithnumber) ?? null }));
}

/**
 * Best-effort chain/body split for rendering sanad separately.
 * Returns null sanad when a clear split cannot be detected.
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
