import { describe, expect, it } from "vitest";

import { dedupeLastReadsByHref, touchReadingProgress } from "../qalb-last-reads.js";

describe("qalb-last-reads", () => {
  it("dedupeLastReadsByHref keeps first occurrence of identical href", () => {
    const out = dedupeLastReadsByHref(
      [
        { href: "/read?surah=2&startVerse=5", label: "first" },
        { href: "/read?surah=2&startVerse=5", label: "dup" },
        { href: "/read?surah=3&startVerse=1", label: "c" },
      ],
      5,
    );
    expect(out.map((r) => r.label)).toEqual(["first", "c"]);
  });

  it("touchReadingProgress replaces prior row for same surah", () => {
    const prev = [
      { href: "/read?surah=1&startVerse=1", label: "Al-Fatihah", type: "surah" },
      { href: "/read?surah=2&startVerse=1", label: "Al-Baqarah", type: "surah" },
    ];
    const next = touchReadingProgress(prev, {
      chapterId: 2,
      verseNum: 255,
      chapterName: "Al-Baqarah",
      subtitle: "",
    });
    expect(next.some((r) => r.href.includes("startVerse=255"))).toBe(true);
    expect(next.filter((r) => String(r.href).includes("surah=2")).length).toBe(1);
  });
});
