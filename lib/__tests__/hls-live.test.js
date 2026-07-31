import { describe, expect, it, vi } from "vitest";

import {
  LIVE_EDGE_MAX_DRIFT_S,
  LIVE_HLS_CONFIG,
  isLiveHlsSourceFailoverDetail,
  isLiveHlsStallDetail,
  liveEdgeSeekTarget,
  mediaBufferedEnd,
  scheduleLiveHlsStallRecovery,
} from "@/lib/hls-live";

describe("LIVE_HLS_CONFIG", () => {
  it("uses stable live-TV settings", () => {
    expect(LIVE_HLS_CONFIG.lowLatencyMode).toBe(false);
    expect(LIVE_HLS_CONFIG.startLevel).toBe(-1);
    expect(LIVE_HLS_CONFIG.maxBufferLength).toBeLessThanOrEqual(20);
    expect(LIVE_HLS_CONFIG.enableWorker).toBe(false);
  });
});

describe("isLiveHlsStallDetail", () => {
  it("recognizes buffer stall details", () => {
    expect(isLiveHlsStallDetail("bufferStalledError")).toBe(true);
    expect(isLiveHlsStallDetail("bufferSeekOverHole")).toBe(true);
    expect(isLiveHlsStallDetail("fragLoadError")).toBe(false);
  });
});

describe("isLiveHlsSourceFailoverDetail", () => {
  it("fails over when the manifest itself never loaded", () => {
    // A 404 origin cannot be fixed by retrying the same URL.
    expect(isLiveHlsSourceFailoverDetail("manifestLoadError")).toBe(true);
    expect(isLiveHlsSourceFailoverDetail("manifestLoadTimeOut")).toBe(true);
    expect(isLiveHlsSourceFailoverDetail("manifestParsingError")).toBe(true);
    expect(isLiveHlsSourceFailoverDetail("levelLoadError")).toBe(true);
  });

  it("does not fail over on recoverable mid-stream errors", () => {
    expect(isLiveHlsSourceFailoverDetail("fragLoadError")).toBe(false);
    expect(isLiveHlsSourceFailoverDetail("bufferStalledError")).toBe(false);
    expect(isLiveHlsSourceFailoverDetail(undefined)).toBe(false);
    expect(isLiveHlsSourceFailoverDetail(null)).toBe(false);
  });
});

describe("scheduleLiveHlsStallRecovery", () => {
  it("debounces startLoad per hls instance", () => {
    const registry = new Map();
    const hls = { startLoad: vi.fn() };
    expect(scheduleLiveHlsStallRecovery(registry, hls, 1000)).toBe(true);
    expect(hls.startLoad).toHaveBeenCalledWith(-1);
    expect(scheduleLiveHlsStallRecovery(registry, hls, 1000)).toBe(false);
    expect(hls.startLoad).toHaveBeenCalledTimes(1);
  });
});

describe("mediaBufferedEnd", () => {
  const ranges = (end) => ({ length: 1, end: () => end });

  it("returns the end of the last buffered range", () => {
    expect(mediaBufferedEnd({ buffered: ranges(120.5) })).toBe(120.5);
  });

  it("reads the last range when several are buffered", () => {
    expect(mediaBufferedEnd({ buffered: { length: 3, end: (i) => [10, 40, 90][i] } })).toBe(90);
  });

  it("is NaN when nothing is buffered", () => {
    expect(mediaBufferedEnd({ buffered: { length: 0, end: () => 0 } })).toBeNaN();
    expect(mediaBufferedEnd(null)).toBeNaN();
    expect(mediaBufferedEnd({})).toBeNaN();
  });

  it("is NaN when the range lookup throws", () => {
    expect(
      mediaBufferedEnd({
        buffered: {
          length: 1,
          end: () => {
            throw new Error("InvalidStateError");
          },
        },
      }),
    ).toBeNaN();
  });
});

describe("liveEdgeSeekTarget", () => {
  it("seeks when playback has drifted out of the live window", () => {
    // Slot was stopped while the playlist rolled on — classic stale resume.
    expect(liveEdgeSeekTarget({ currentTime: 100, liveSyncPosition: 400 })).toBe(400);
  });

  it("stays put when already at the live edge", () => {
    expect(liveEdgeSeekTarget({ currentTime: 398, liveSyncPosition: 400 })).toBeNull();
  });

  it("stays put at exactly the drift tolerance", () => {
    expect(liveEdgeSeekTarget({ currentTime: 400 - LIVE_EDGE_MAX_DRIFT_S, liveSyncPosition: 400 })).toBeNull();
  });

  it("seeks just past the drift tolerance", () => {
    expect(liveEdgeSeekTarget({ currentTime: 400 - LIVE_EDGE_MAX_DRIFT_S - 0.5, liveSyncPosition: 400 })).toBe(400);
  });

  it("prefers liveSyncPosition over bufferedEnd", () => {
    expect(liveEdgeSeekTarget({ currentTime: 0, liveSyncPosition: 300, bufferedEnd: 500 })).toBe(300);
  });

  it("falls back to bufferedEnd when there is no live sync position", () => {
    expect(liveEdgeSeekTarget({ currentTime: 0, bufferedEnd: 500 })).toBe(500);
    expect(liveEdgeSeekTarget({ currentTime: 0, liveSyncPosition: NaN, bufferedEnd: 500 })).toBe(500);
  });

  it("returns null when there is nowhere to seek to yet", () => {
    // Immediately after startLoad: nothing buffered, no sync point.
    expect(liveEdgeSeekTarget({ currentTime: 0 })).toBeNull();
    expect(liveEdgeSeekTarget({ currentTime: 0, bufferedEnd: NaN })).toBeNull();
    expect(liveEdgeSeekTarget({ currentTime: 0, liveSyncPosition: 0 })).toBeNull();
    expect(liveEdgeSeekTarget()).toBeNull();
  });

  it("never seeks backwards", () => {
    expect(liveEdgeSeekTarget({ currentTime: 900, liveSyncPosition: 400 })).toBeNull();
  });

  it("honours a custom drift tolerance", () => {
    expect(liveEdgeSeekTarget({ currentTime: 395, liveSyncPosition: 400, maxDriftS: 2 })).toBe(400);
  });

  it("treats a non-finite currentTime as zero", () => {
    expect(liveEdgeSeekTarget({ currentTime: NaN, liveSyncPosition: 400 })).toBe(400);
  });
});
