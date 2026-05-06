import { describe, expect, it } from "vitest";

import { normalizeVerseAudioUrl } from "../verse-audio-url.js";

describe("normalizeVerseAudioUrl", () => {
  it("prefixes protocol-relative mirrors URLs with https", () => {
    expect(normalizeVerseAudioUrl("//mirrors.quranicaudio.com/everyayah/x.mp3")).toBe(
      "https://mirrors.quranicaudio.com/everyayah/x.mp3",
    );
  });

  it("leaves full https URLs unchanged", () => {
    expect(normalizeVerseAudioUrl("https://cdn.example.com/a.mp3")).toBe("https://cdn.example.com/a.mp3");
  });

  it("joins relative paths to verses CDN", () => {
    expect(normalizeVerseAudioUrl("foo/bar.mp3")).toBe("https://verses.quran.com/foo/bar.mp3");
    expect(normalizeVerseAudioUrl("/foo/bar.mp3")).toBe("https://verses.quran.com/foo/bar.mp3");
  });
});
