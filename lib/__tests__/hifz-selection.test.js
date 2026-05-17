import { describe, expect, it, vi } from "vitest";

import {
  expandSelectionToVerseKeys,
  expandSelectionToVerseKeysSync,
  verseKey,
  verseKeysFromPageVerses,
} from "@/lib/hifz-selection";

const CHAPTERS = [
  { id: 1, verses_count: 7 },
  { id: 2, verses_count: 286 },
  { id: 3, verses_count: 200 },
];

describe("expandSelectionToVerseKeysSync", () => {
  it("expands whole surah", () => {
    const { keys } = expandSelectionToVerseKeysSync({ mode: "surah", surahId: 1 }, CHAPTERS);
    expect(keys).toEqual(["1:1", "1:2", "1:3", "1:4", "1:5", "1:6", "1:7"]);
  });

  it("expands surah range inclusive", () => {
    const { keys } = expandSelectionToVerseKeysSync({ mode: "surahRange", fromSurahId: 1, toSurahId: 2 }, CHAPTERS);
    expect(keys[0]).toBe("1:1");
    expect(keys[6]).toBe("1:7");
    expect(keys[7]).toBe("2:1");
    expect(keys.length).toBe(7 + 286);
  });

  it("swaps reversed surah range", () => {
    const { keys } = expandSelectionToVerseKeysSync({ mode: "surahRange", fromSurahId: 2, toSurahId: 1 }, CHAPTERS);
    expect(keys.length).toBe(7 + 286);
  });

  it("clamps ayah range to surah length", () => {
    const { keys } = expandSelectionToVerseKeysSync(
      { mode: "ayahRange", surahId: 1, startAyah: 5, endAyah: 99 },
      CHAPTERS,
    );
    expect(keys).toEqual(["1:5", "1:6", "1:7"]);
  });

  it("returns error for invalid surah", () => {
    const { keys, error } = expandSelectionToVerseKeysSync({ mode: "surah", surahId: 200 }, CHAPTERS);
    expect(keys).toEqual([]);
    expect(error).toBeTruthy();
  });
});

describe("verseKeysFromPageVerses", () => {
  it("dedupes verse keys in order", () => {
    const keys = verseKeysFromPageVerses([{ verse_key: "2:255" }, { verse_key: "2:255" }, { verse_key: "2:256" }]);
    expect(keys).toEqual(["2:255", "2:256"]);
  });
});

describe("expandSelectionToVerseKeys page mode", () => {
  it("uses injected fetchPage", async () => {
    const fetchPage = vi.fn().mockResolvedValue([{ verse_key: "1:1" }, { verse_key: "1:2" }]);
    const { keys, error } = await expandSelectionToVerseKeys({ mode: "page", mushafPage: 1 }, CHAPTERS, { fetchPage });
    expect(fetchPage).toHaveBeenCalledWith(1);
    expect(keys).toEqual(["1:1", "1:2"]);
    expect(error).toBeUndefined();
  });
});

describe("verseKey", () => {
  it("formats surah:ayah", () => {
    expect(verseKey(2, 255)).toBe("2:255");
  });
});
