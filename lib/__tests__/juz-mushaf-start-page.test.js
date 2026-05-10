import { describe, expect, it } from "vitest";

import { firstMushafPageForJuz, lastMushafPageForJuz } from "@/lib/juz-mushaf-start-page";

describe("juz-mushaf-start-page", () => {
  it("first page for juz 1 and 30", () => {
    expect(firstMushafPageForJuz(1)).toBe(1);
    expect(firstMushafPageForJuz(30)).toBe(582);
  });

  it("last page is one before next juz first, juz 30 ends at 604", () => {
    expect(lastMushafPageForJuz(1)).toBe(firstMushafPageForJuz(2) - 1);
    expect(lastMushafPageForJuz(29)).toBe(firstMushafPageForJuz(30) - 1);
    expect(lastMushafPageForJuz(30)).toBe(604);
  });
});
