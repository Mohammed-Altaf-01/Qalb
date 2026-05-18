import { describe, expect, it } from "vitest";

import { findActiveWord, wordHighlightIndex } from "@/lib/verse-word-highlight";

describe("findActiveWord", () => {
  const segments = [
    [0, 1, 0, 500],
    [0, 2, 500, 1000],
    [0, 3, 1000, 1500],
  ];

  it("returns -1 when segments missing", () => {
    expect(findActiveWord(100, null)).toBe(-1);
    expect(findActiveWord(100, [])).toBe(-1);
  });

  it("returns zero-based index for active segment", () => {
    expect(findActiveWord(0, segments)).toBe(0);
    expect(findActiveWord(499, segments)).toBe(0);
    expect(findActiveWord(500, segments)).toBe(1);
    expect(findActiveWord(999, segments)).toBe(1);
    expect(findActiveWord(1499, segments)).toBe(2);
  });

  it("returns -1 before first or after last segment", () => {
    expect(findActiveWord(-1, segments)).toBe(-1);
    expect(findActiveWord(2000, segments)).toBe(-1);
  });
});

describe("wordHighlightIndex", () => {
  it("matches by word.position when set", () => {
    expect(wordHighlightIndex({ position: 2 }, 0, 1)).toBe(true);
    expect(wordHighlightIndex({ position: 2 }, 0, 0)).toBe(false);
  });

  it("falls back to array index + 1", () => {
    expect(wordHighlightIndex({}, 0, 0)).toBe(true);
    expect(wordHighlightIndex({}, 1, 0)).toBe(false);
  });
});
