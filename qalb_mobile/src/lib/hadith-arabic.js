/** Same as web attachArabicToHadiths (no Node fs). */
export function attachArabicToHadiths(englishHadiths, arabicPayload) {
  if (!arabicPayload?.hadiths?.length) {
    return englishHadiths.map((h) => ({ ...h, textArabic: null }));
  }
  const map = new Map(arabicPayload.hadiths.map((h) => [h.hadithnumber, h.text]));
  return englishHadiths.map((h) => ({ ...h, textArabic: map.get(h.hadithnumber) ?? null }));
}
