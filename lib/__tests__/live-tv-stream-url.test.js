import { describe, expect, it } from "vitest";

import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

import { normalizeLiveTvStreamUrl } from "../live-tv-stream-url";

describe("normalizeLiveTvStreamUrl", () => {
  it("rewrites broken holol Quran path to working HLS", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/live/quran/playlist.m3u8")).toBe(
      LIVE_STREAM_FALLBACK_MAKKAH,
    );
  });

  it("rewrites broken holol Sunnah path to working HLS", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/live/sunnah/playlist.m3u8")).toBe(
      LIVE_STREAM_FALLBACK_MADINAH,
    );
  });

  it("leaves unrelated URLs unchanged", () => {
    const u = "https://example.com/stream.m3u8";
    expect(normalizeLiveTvStreamUrl(u)).toBe(u);
  });

  it("maps mp3quran channel id 3/4 holol URLs to Akamai fallbacks", () => {
    expect(
      normalizeLiveTvStreamUrl("https://win.holol.com/live/quran/playlist.m3u8", { id: 3, name: "Quran channel" }),
    ).toBe(LIVE_STREAM_FALLBACK_MAKKAH);
    expect(
      normalizeLiveTvStreamUrl("https://win.holol.com/live/sunnah/playlist.m3u8", { id: 4, name: "Sunna channel" }),
    ).toBe(LIVE_STREAM_FALLBACK_MADINAH);
  });

  it("maps holol host without path using channel name", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/other.m3u8", { name: "Sunna channel" })).toBe(
      LIVE_STREAM_FALLBACK_MADINAH,
    );
  });

  it("keeps globecast URLs for known channel ids", () => {
    const u = LIVE_STREAM_FALLBACK_MAKKAH;
    expect(normalizeLiveTvStreamUrl(u, { id: 3, name: "Quran channel" })).toBe(u);
  });
});
