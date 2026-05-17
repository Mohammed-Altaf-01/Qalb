import { describe, expect, it, vi } from "vitest";

import { LIVE_HLS_CONFIG, isLiveHlsStallDetail, scheduleLiveHlsStallRecovery } from "@/lib/hls-live";

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
