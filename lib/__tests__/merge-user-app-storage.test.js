import { describe, expect, it } from "vitest";

import { mergePreferencesPayload, mergeReadingProgress, mergeRecentByHref } from "../merge-user-app-storage.js";

describe("mergeRecentByHref", () => {
  it("prefers remote order and dedupes", () => {
    const out = mergeRecentByHref(
      [{ href: "/a", x: 1 }],
      [{ href: "/a", x: 2 }, { href: "/b", x: 3 }],
      5,
    );
    expect(out.map((o) => o.href)).toEqual(["/a", "/b"]);
    expect(out[0].x).toBe(1);
  });
});

describe("mergeReadingProgress", () => {
  it("picks newer updatedAt", () => {
    const m = mergeReadingProgress(
      { surahId: 2, verseNum: 10, translationId: 20, updatedAt: 100 },
      { surahId: 1, verseNum: 1, translationId: 20, updatedAt: 50 },
    );
    expect(m?.surahId).toBe(2);
  });
});

describe("mergePreferencesPayload", () => {
  it("falls back to local theme when remote missing", () => {
    const p = mergePreferencesPayload({}, "light", "compact", 3, "indopak", true);
    expect(p.theme).toBe("light");
    expect(p.readingScale).toBe("compact");
    expect(p.reciterId).toBe(3);
    expect(p.quranScript).toBe("indopak");
    expect(p.tajweedEnabled).toBe(true);
  });
});
