import { describe, expect, it } from "vitest";

import {
  LIVE_STREAM_CANDIDATES,
  LIVE_STREAM_ORIGINS,
  liveStreamSlotForUrl,
  nextLiveStreamCandidate,
  primaryLiveStreamUrl,
} from "@/lib/live-stream-candidates";

const HOLOL_MAKKAH = "https://win.holol.com/live/quran/playlist.m3u8";
const HOLOL_MADINAH = "https://win.holol.com/live/sunnah/playlist.m3u8";
const GLOBECAST_MAKKAH = "https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8";
const GLOBECAST_MADINAH = "https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8";

describe("LIVE_STREAM_CANDIDATES", () => {
  it("gives every slot a backup origin", () => {
    for (const slot of ["makkah", "madinah"]) {
      expect(LIVE_STREAM_CANDIDATES[slot].length).toBeGreaterThan(1);
    }
  });

  it("never shares a URL between slots", () => {
    const overlap = LIVE_STREAM_CANDIDATES.makkah.filter((u) => LIVE_STREAM_CANDIDATES.madinah.includes(u));
    expect(overlap).toEqual([]);
  });

  it("covers every candidate host in the preconnect origins", () => {
    const hosts = [...LIVE_STREAM_CANDIDATES.makkah, ...LIVE_STREAM_CANDIDATES.madinah].map((u) => new URL(u).origin);
    for (const host of hosts) {
      expect(LIVE_STREAM_ORIGINS).toContain(host);
    }
  });
});

describe("primaryLiveStreamUrl", () => {
  it("prefers holol for Makkah while Globecast saudi_quran is 404", () => {
    expect(primaryLiveStreamUrl("makkah")).toBe(HOLOL_MAKKAH);
  });

  it("prefers Globecast for Madinah", () => {
    expect(primaryLiveStreamUrl("madinah")).toBe(GLOBECAST_MADINAH);
  });

  it("defaults an unknown slot to Makkah", () => {
    expect(primaryLiveStreamUrl(undefined)).toBe(HOLOL_MAKKAH);
    expect(primaryLiveStreamUrl("bogus")).toBe(HOLOL_MAKKAH);
  });
});

describe("liveStreamSlotForUrl", () => {
  it("classifies both packagings of each slot", () => {
    expect(liveStreamSlotForUrl(HOLOL_MAKKAH)).toBe("makkah");
    expect(liveStreamSlotForUrl(GLOBECAST_MAKKAH)).toBe("makkah");
    expect(liveStreamSlotForUrl(HOLOL_MADINAH)).toBe("madinah");
    expect(liveStreamSlotForUrl(GLOBECAST_MADINAH)).toBe("madinah");
  });

  it("classifies unlisted variants by path shape", () => {
    expect(liveStreamSlotForUrl("https://example.com/live/eds/saudi_quran/hls/index.m3u8")).toBe("makkah");
    expect(liveStreamSlotForUrl("https://backup.holol.com/live/sunnah/chunklist.m3u8")).toBe("madinah");
  });

  it("returns null for anything outside the pair", () => {
    expect(liveStreamSlotForUrl("https://example.com/stream.m3u8")).toBeNull();
    expect(liveStreamSlotForUrl("not a url")).toBeNull();
    expect(liveStreamSlotForUrl("")).toBeNull();
    expect(liveStreamSlotForUrl(null)).toBeNull();
    expect(liveStreamSlotForUrl(undefined)).toBeNull();
  });
});

describe("nextLiveStreamCandidate", () => {
  it("advances to the slot's backup origin", () => {
    expect(nextLiveStreamCandidate(HOLOL_MAKKAH)).toBe(GLOBECAST_MAKKAH);
    expect(nextLiveStreamCandidate(GLOBECAST_MADINAH)).toBe(HOLOL_MADINAH);
  });

  it("stops at the end of the list instead of wrapping", () => {
    // Wrapping would spin hls.js between two dead origins forever.
    expect(nextLiveStreamCandidate(GLOBECAST_MAKKAH)).toBeNull();
    expect(nextLiveStreamCandidate(HOLOL_MADINAH)).toBeNull();
  });

  it("terminates after walking a whole slot", () => {
    let url = primaryLiveStreamUrl("makkah");
    const seen = [url];
    for (let i = 0; i < 10 && url; i += 1) {
      url = nextLiveStreamCandidate(url);
      if (url) seen.push(url);
    }
    expect(url).toBeNull();
    expect(seen).toEqual(LIVE_STREAM_CANDIDATES.makkah);
  });

  it("starts at the top of the list for a slotted URL that is not listed", () => {
    expect(nextLiveStreamCandidate("https://example.com/live/eds/saudi_quran/hls/index.m3u8")).toBe(HOLOL_MAKKAH);
  });

  it("returns null for URLs outside the pair", () => {
    expect(nextLiveStreamCandidate("https://example.com/stream.m3u8")).toBeNull();
    expect(nextLiveStreamCandidate(null)).toBeNull();
  });
});
