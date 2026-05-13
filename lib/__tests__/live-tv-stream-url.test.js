import { describe, expect, it } from "vitest";

import {
  LIVE_STREAM_FALLBACK_MADINAH,
  LIVE_STREAM_FALLBACK_MAKKAH,
} from "@/lib/live-stream-defaults";

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
});
