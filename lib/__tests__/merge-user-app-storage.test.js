import { describe, expect, it } from "vitest";

import {
  mergeKeyThemesPayload,
  mergePreferencesPayload,
  mergeReadingProgress,
  mergeRecentByHref,
  mergeTimeTracking,
  mergeVerseKeyedBlob,
} from "../merge-user-app-storage.js";

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

describe("mergeVerseKeyedBlob", () => {
  it("prefers longer chat arrays", () => {
    const m = mergeVerseKeyedBlob(
      { "2:255": [{ role: "user", content: "a" }] },
      { "2:255": [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] },
    );
    expect(m["2:255"]).toHaveLength(2);
  });

  it("prefers newer note by savedAt", () => {
    const m = mergeVerseKeyedBlob(
      { "1:1": { text: "old", savedAt: "2020-01-01T00:00:00.000Z" } },
      { "1:1": { text: "new", savedAt: "2025-01-01T00:00:00.000Z" } },
    );
    expect(m["1:1"].text).toBe("new");
  });
});

describe("mergeKeyThemesPayload", () => {
  it("picks newer updatedAt per surah", () => {
    const m = mergeKeyThemesPayload(
      { themesBySurahId: { "2": { markdown: "R", updatedAt: 10 } } },
      { themesBySurahId: { "2": { markdown: "L", updatedAt: 50 } } },
    );
    expect(m.themesBySurahId["2"].markdown).toBe("L");
  });
});

describe("mergeTimeTracking", () => {
  it("takes per-day max and sums merged byDay for totalMinutes", () => {
    const m = mergeTimeTracking(
      { byDay: { "2026-01-01": 5, "2026-01-02": 10 }, totalMinutes: 15, updatedAt: 100 },
      { byDay: { "2026-01-01": 8, "2026-01-03": 3 }, totalMinutes: 11, updatedAt: 200 },
    );
    expect(m.byDay["2026-01-01"]).toBe(8);
    expect(m.byDay["2026-01-02"]).toBe(10);
    expect(m.byDay["2026-01-03"]).toBe(3);
    expect(m.totalMinutes).toBe(8 + 10 + 3);
    expect(m.updatedAt).toBe(200);
  });

  it("falls back to max totalMinutes when byDay is empty", () => {
    const m = mergeTimeTracking({ totalMinutes: 40, updatedAt: 1 }, { totalMinutes: 12, updatedAt: 2 });
    expect(m.totalMinutes).toBe(40);
  });
});
