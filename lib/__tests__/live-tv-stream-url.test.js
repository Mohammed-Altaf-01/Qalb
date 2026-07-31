import { describe, expect, it } from "vitest";

import { primaryLiveStreamUrl } from "@/lib/live-stream-candidates";
import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

import { normalizeLiveTvStreamUrl } from "../live-tv-stream-url";

const DEAD_GLOBECAST_MAKKAH = "https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8";

describe("normalizeLiveTvStreamUrl", () => {
  it("pins the mp3quran Quran channel to the Makkah primary", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/live/quran/playlist.m3u8")).toBe(
      LIVE_STREAM_FALLBACK_MAKKAH,
    );
  });

  it("pins the mp3quran Sunnah channel to the Madinah primary", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/live/sunnah/playlist.m3u8")).toBe(
      LIVE_STREAM_FALLBACK_MADINAH,
    );
  });

  it("leaves unrelated URLs unchanged", () => {
    const u = "https://example.com/stream.m3u8";
    expect(normalizeLiveTvStreamUrl(u)).toBe(u);
  });

  it("resolves mp3quran channel ids 3 and 4 to their slots", () => {
    expect(
      normalizeLiveTvStreamUrl("https://win.holol.com/live/quran/playlist.m3u8", { id: 3, name: "Quran channel" }),
    ).toBe(LIVE_STREAM_FALLBACK_MAKKAH);
    expect(
      normalizeLiveTvStreamUrl("https://win.holol.com/live/sunnah/playlist.m3u8", { id: 4, name: "Sunna channel" }),
    ).toBe(LIVE_STREAM_FALLBACK_MADINAH);
  });

  it("falls back to the channel name when the path says nothing", () => {
    expect(normalizeLiveTvStreamUrl("https://win.holol.com/other.m3u8", { name: "Sunna channel" })).toBe(
      LIVE_STREAM_FALLBACK_MADINAH,
    );
  });

  it("rewrites the dead Globecast Makkah URL to the current primary", () => {
    // Globecast dropped `saudi_quran` (404) while `saudi_sunnah` stayed up, so
    // an upstream still advertising it must not be passed through as-is.
    expect(normalizeLiveTvStreamUrl(DEAD_GLOBECAST_MAKKAH, { id: 3, name: "Quran channel" })).toBe(
      primaryLiveStreamUrl("makkah"),
    );
    expect(normalizeLiveTvStreamUrl(DEAD_GLOBECAST_MAKKAH)).toBe(primaryLiveStreamUrl("makkah"));
  });

  it("keeps the Madinah primary when upstream already serves it", () => {
    expect(normalizeLiveTvStreamUrl(LIVE_STREAM_FALLBACK_MADINAH, { id: 4, name: "Sunna channel" })).toBe(
      LIVE_STREAM_FALLBACK_MADINAH,
    );
  });

  it("returns empty input untouched", () => {
    expect(normalizeLiveTvStreamUrl("")).toBe("");
    expect(normalizeLiveTvStreamUrl(null)).toBe("");
  });
});
