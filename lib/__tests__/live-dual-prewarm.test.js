import { describe, expect, it } from "vitest";

import { LIVE_STREAM_FALLBACK_MADINAH, LIVE_STREAM_FALLBACK_MAKKAH } from "@/lib/live-stream-defaults";

import {
  getLiveDualLoadPolicy,
  isMakkahMadinahStreamUrl,
  resolveMakkahMadinahUrls,
  slotForSelectedUrl,
} from "../live-dual-prewarm";

describe("resolveMakkahMadinahUrls", () => {
  it("uses fallbacks when channels empty", () => {
    const r = resolveMakkahMadinahUrls([]);
    expect(r.makkahUrl).toBe(LIVE_STREAM_FALLBACK_MAKKAH);
    expect(r.madinahUrl).toBe(LIVE_STREAM_FALLBACK_MADINAH);
  });

  it("picks Makkah by name and Madinah by name", () => {
    const r = resolveMakkahMadinahUrls([
      { id: 1, name: "Foo", url: "https://example.com/a.m3u8" },
      { id: 2, name: "Quran TV Makkah", url: "https://example.com/makkah.m3u8" },
      { id: 3, name: "Sunnah Madinah", url: "https://example.com/mad.m3u8" },
    ]);
    expect(r.makkahUrl).toBe("https://example.com/makkah.m3u8");
    expect(r.madinahUrl).toBe("https://example.com/mad.m3u8");
  });

  it("getLiveDualLoadPolicy loads only the active slot", () => {
    // Both slots loading at once splits bandwidth and (with enableWorker:false)
    // main-thread demux time between two 24/7 streams, so neither plays
    // reliably outside a fast desktop connection.
    expect(getLiveDualLoadPolicy("makkah")).toEqual({ makkah: "load", madinah: "stop" });
    expect(getLiveDualLoadPolicy("madinah")).toEqual({ makkah: "stop", madinah: "load" });
  });

  it("getLiveDualLoadPolicy defaults an unknown slot to Makkah", () => {
    expect(getLiveDualLoadPolicy(undefined)).toEqual({ makkah: "load", madinah: "stop" });
    expect(getLiveDualLoadPolicy("bogus")).toEqual({ makkah: "load", madinah: "stop" });
  });

  it("getLiveDualLoadPolicy never loads both slots at once", () => {
    for (const slot of ["makkah", "madinah"]) {
      const policy = getLiveDualLoadPolicy(slot);
      const loading = Object.values(policy).filter((v) => v === "load");
      expect(loading).toHaveLength(1);
    }
  });

  it("slotForSelectedUrl detects Madinah by pathname", () => {
    expect(slotForSelectedUrl(LIVE_STREAM_FALLBACK_MADINAH)).toBe("madinah");
  });

  it("isMakkahMadinahStreamUrl matches Globecast paths", () => {
    expect(isMakkahMadinahStreamUrl(LIVE_STREAM_FALLBACK_MADINAH, [])).toBe(true);
    expect(isMakkahMadinahStreamUrl("https://example.com/other.m3u8", [])).toBe(false);
  });

  it("uses distinct second URL when no madinah name match", () => {
    const r = resolveMakkahMadinahUrls([
      { id: 2, name: "Channel A", url: "https://a/x.m3u8" },
      { id: 3, name: "Channel B", url: "https://b/y.m3u8" },
    ]);
    expect(r.makkahUrl).toBe("https://a/x.m3u8");
    expect(r.madinahUrl).toBe("https://b/y.m3u8");
  });
});
