import { describe, expect, it } from "vitest";

import { pickLatestReadingResume } from "@/lib/continue-reading";

describe("pickLatestReadingResume", () => {
  it("returns null when both lists empty", () => {
    expect(pickLatestReadingResume([], [])).toBeNull();
    expect(pickLatestReadingResume(null, undefined)).toBeNull();
  });

  it("returns quran when only quran", () => {
    const q = [{ href: "/read?surah=2", label: "Al-Baqarah", timestamp: 100 }];
    expect(pickLatestReadingResume(q, [])).toEqual({
      href: "/read?surah=2",
      label: "Al-Baqarah",
      kind: "quran",
    });
  });

  it("returns hadith when only hadith", () => {
    const h = [{ href: "/ahadith/foo", label: "Book", timestamp: 50 }];
    expect(pickLatestReadingResume([], h)).toEqual({
      href: "/ahadith/foo",
      label: "Book",
      kind: "hadith",
    });
  });

  it("picks newer timestamp", () => {
    const q = [{ href: "/read?surah=1", timestamp: 10 }];
    const h = [{ href: "/ahadith/x", timestamp: 20 }];
    expect(pickLatestReadingResume(q, h)?.kind).toBe("hadith");
    expect(pickLatestReadingResume(q, h)?.href).toBe("/ahadith/x");
  });

  it("when both lack timestamps prefers quran", () => {
    const q = [{ href: "/read?surah=7", label: "Al-A'raf" }];
    const h = [{ href: "/ahadith/z", label: "Z" }];
    expect(pickLatestReadingResume(q, h)?.kind).toBe("quran");
  });
});
