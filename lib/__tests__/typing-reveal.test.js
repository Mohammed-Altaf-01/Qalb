import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TYPING_REVEAL_MAX_MS,
  TYPING_REVEAL_MIN_MS,
  charsRevealedAt,
  prefersReducedMotion,
  typingRevealDurationMs,
} from "../typing-reveal";

describe("typingRevealDurationMs", () => {
  it("returns 0 for empty or invalid text", () => {
    expect(typingRevealDurationMs(0)).toBe(0);
    expect(typingRevealDurationMs(-5)).toBe(0);
    expect(typingRevealDurationMs(NaN)).toBe(0);
    expect(typingRevealDurationMs(undefined)).toBe(0);
  });

  it("keeps the original 10ms/char cadence in the mid range", () => {
    expect(typingRevealDurationMs(30)).toBe(300);
    expect(typingRevealDurationMs(45)).toBe(450);
  });

  it("floors very short text so it still reads as a reveal", () => {
    expect(typingRevealDurationMs(4)).toBe(TYPING_REVEAL_MIN_MS);
  });

  it("caps long translations at the UI motion budget", () => {
    // Ayat al-Kursi scale — previously ~6s of typing.
    expect(typingRevealDurationMs(600)).toBe(TYPING_REVEAL_MAX_MS);
    expect(typingRevealDurationMs(5000)).toBe(TYPING_REVEAL_MAX_MS);
  });

  it("honours overrides", () => {
    expect(typingRevealDurationMs(600, { maxMs: 1000 })).toBe(1000);
    expect(typingRevealDurationMs(10, { minMs: 0, msPerChar: 5 })).toBe(50);
  });
});

describe("charsRevealedAt", () => {
  it("reveals nothing at the start", () => {
    expect(charsRevealedAt(0, 100, 600)).toBe(0);
    expect(charsRevealedAt(-10, 100, 600)).toBe(0);
  });

  it("reveals everything at or past the end", () => {
    expect(charsRevealedAt(600, 100, 600)).toBe(100);
    expect(charsRevealedAt(9999, 100, 600)).toBe(100);
  });

  it("advances linearly", () => {
    expect(charsRevealedAt(150, 100, 600)).toBe(25);
    expect(charsRevealedAt(300, 100, 600)).toBe(50);
    expect(charsRevealedAt(450, 100, 600)).toBe(75);
  });

  it("never exceeds the total length", () => {
    for (let t = 0; t <= 700; t += 37) {
      expect(charsRevealedAt(t, 42, 600)).toBeLessThanOrEqual(42);
      expect(charsRevealedAt(t, 42, 600)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns the full text when there is no duration to spread over", () => {
    expect(charsRevealedAt(0, 100, 0)).toBe(100);
  });

  it("handles empty text", () => {
    expect(charsRevealedAt(100, 0, 600)).toBe(0);
  });
});

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false when matchMedia is unavailable", () => {
    vi.stubGlobal("window", {});
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reflects the media query", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is false when matchMedia throws", () => {
    vi.stubGlobal("window", {
      matchMedia: () => {
        throw new Error("nope");
      },
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});
