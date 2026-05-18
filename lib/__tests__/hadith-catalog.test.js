import { describe, expect, it } from "vitest";

import {
  attachArabicToHadiths,
  formatHadithGrades,
  getHadithChaptersForBook,
  listHadithBooks,
} from "../hadith-catalog.js";

describe("hadith-catalog", () => {
  it("listHadithBooks returns known collections", () => {
    const books = listHadithBooks();
    expect(books.length).toBeGreaterThan(0);
    const slugs = books.map((b) => b.slug);
    expect(slugs).toContain("bukhari");
    expect(slugs).toContain("muslim");
    expect(books[0]).toHaveProperty("name");
    expect(books[0]).toHaveProperty("sectionCount");
  });

  it("getHadithChaptersForBook returns chapters for bukhari", () => {
    const meta = getHadithChaptersForBook("bukhari");
    expect(meta).not.toBeNull();
    const { chapters } = meta;
    expect(chapters.length).toBeGreaterThan(10);
    expect(chapters[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
    });
  });

  it("getHadithChaptersForBook returns null for unknown slug", () => {
    expect(getHadithChaptersForBook("not-a-real-book-xyz")).toBeNull();
  });

  it("formatHadithGrades renders CDN grade objects", () => {
    expect(formatHadithGrades([{ name: "Salim al-Hilali", grade: "Sahih" }])).toBe("Sahih (Salim al-Hilali)");
    expect(formatHadithGrades(["Hasan", "Sahih"])).toBe("Hasan · Sahih");
    expect(formatHadithGrades([])).toBe("");
  });

  it("attachArabicToHadiths merges by hadithnumber", () => {
    const en = [
      { hadithnumber: 1, text: "English one" },
      { hadithnumber: 2, text: "English two" },
    ];
    const arPayload = { hadiths: [{ hadithnumber: 1, text: "عربي" }] };
    const merged = attachArabicToHadiths(en, arPayload);
    expect(merged[0].textArabic).toBe("عربي");
    expect(merged[1].textArabic).toBeNull();
  });
});
