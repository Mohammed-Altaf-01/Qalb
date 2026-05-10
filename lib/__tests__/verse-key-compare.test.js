import { describe, expect, it } from "vitest";

import { compareVerseKey, minVerseKeyFromMapping } from "@/lib/verse-key-compare";

describe("verse-key-compare", () => {
  it("orders by surah then ayah", () => {
    expect(compareVerseKey("2:255", "2:256")).toBe(-1);
    expect(compareVerseKey("3:1", "2:255")).toBe(1);
    expect(compareVerseKey("1:1", "1:1")).toBe(0);
  });

  it("minVerseKeyFromMapping", () => {
    expect(minVerseKeyFromMapping({ "2:200": true, "2:142": true })).toBe("2:142");
    expect(minVerseKeyFromMapping({})).toBe(null);
  });
});
