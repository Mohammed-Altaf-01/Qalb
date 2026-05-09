import { describe, expect, it } from "vitest";

import { filterVerseWords, stripVerseEndMarker, toArabicIndicDigits, verseNumberFromKey } from "../arabic-utils";

// ─── stripVerseEndMarker ──────────────────────────────────────────────────────

describe("stripVerseEndMarker", () => {
  it("removes Arabic-Indic digit marker at end of verse", () => {
    const input = "وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ ﴿٢٥٥﴾";
    expect(stripVerseEndMarker(input)).toBe("وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ");
  });

  it("removes single-digit marker", () => {
    const input = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ﴿١﴾";
    expect(stripVerseEndMarker(input)).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ");
  });

  it("removes three-digit marker", () => {
    const input = "some arabic text ﴿١٢٣﴾";
    expect(stripVerseEndMarker(input)).toBe("some arabic text");
  });

  it("handles trailing whitespace around the marker", () => {
    const input = "arabic text   ﴿٧﴾   ";
    expect(stripVerseEndMarker(input)).toBe("arabic text");
  });

  it("does not alter text with no marker", () => {
    const input = "وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ";
    expect(stripVerseEndMarker(input)).toBe("وَهُوَ ٱلْعَلِيُّ ٱلْعَظِيمُ");
  });

  it("handles empty string", () => {
    expect(stripVerseEndMarker("")).toBe("");
  });

  it("does not strip ornate brackets mid-text (only at end)", () => {
    const input = "text ﴿١﴾ more text";
    expect(stripVerseEndMarker(input)).toBe("text ﴿١﴾ more text");
  });

  it("handles Extended Arabic-Indic digits (U+06F0–U+06F9)", () => {
    // Some API responses use Persian/Urdu digit range
    const input = "arabic text ﴿۱۲۳﴾";
    expect(stripVerseEndMarker(input)).toBe("arabic text");
  });
});

// ─── filterVerseWords ─────────────────────────────────────────────────────────

describe("filterVerseWords", () => {
  it("removes words with char_type_name === 'end'", () => {
    const words = [
      { id: 1, char_type_name: "word", text_uthmani: "بِسْمِ" },
      { id: 2, char_type_name: "word", text_uthmani: "ٱللَّهِ" },
      { id: 3, char_type_name: "end", text_uthmani: "﴿١﴾" },
    ];
    const result = filterVerseWords(words);
    expect(result).toHaveLength(2);
    expect(result.every((w) => w.char_type_name !== "end")).toBe(true);
  });

  it("returns all words when none have char_type_name === 'end'", () => {
    const words = [
      { id: 1, char_type_name: "word", text_uthmani: "بِسْمِ" },
      { id: 2, char_type_name: "word", text_uthmani: "ٱللَّهِ" },
    ];
    expect(filterVerseWords(words)).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(filterVerseWords([])).toEqual([]);
  });

  it("handles null/undefined gracefully", () => {
    expect(filterVerseWords(null)).toEqual([]);
    expect(filterVerseWords(undefined)).toEqual([]);
  });

  it("verseNumberFromKey parses ayah number", () => {
    expect(verseNumberFromKey("2:255")).toBe(255);
    expect(verseNumberFromKey("1:1")).toBe(1);
    expect(verseNumberFromKey("bad")).toBe(null);
  });

  it("toArabicIndicDigits maps Western digits", () => {
    expect(toArabicIndicDigits(255)).toBe("٢٥٥");
    expect(toArabicIndicDigits(1)).toBe("١");
    expect(toArabicIndicDigits(0)).toBe("٠");
  });

  it("handles multiple end tokens", () => {
    const words = [
      { id: 1, char_type_name: "end", text_uthmani: "﴿١﴾" },
      { id: 2, char_type_name: "end", text_uthmani: "﴿٢﴾" },
      { id: 3, char_type_name: "word", text_uthmani: "ٱللَّهِ" },
    ];
    const result = filterVerseWords(words);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
});
