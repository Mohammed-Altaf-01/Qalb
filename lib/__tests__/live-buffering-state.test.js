import { describe, expect, it } from "vitest";

import {
  LIVE_OVERLAY_STALL_SHOW_MS,
  hasLiveTimeAdvanced,
  shouldShowLiveConnectingOverlay,
} from "@/lib/live-buffering-state";

describe("shouldShowLiveConnectingOverlay", () => {
  it("shows overlay until first frame", () => {
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: false,
        stallMs: 0,
        isPlaying: true,
        isPaused: false,
      }),
    ).toBe(true);
  });

  it("hides overlay once frames rendered and no stall", () => {
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: true,
        stallMs: 0,
        isPlaying: true,
        isPaused: false,
      }),
    ).toBe(false);
  });

  it("shows overlay only after debounced stall", () => {
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: true,
        stallMs: LIVE_OVERLAY_STALL_SHOW_MS - 1,
        isPlaying: true,
        isPaused: false,
      }),
    ).toBe(false);
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: true,
        stallMs: LIVE_OVERLAY_STALL_SHOW_MS,
        isPlaying: true,
        isPaused: false,
      }),
    ).toBe(true);
  });

  it("hides overlay when paused or not playing", () => {
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: false,
        stallMs: 0,
        isPlaying: false,
        isPaused: false,
      }),
    ).toBe(false);
    expect(
      shouldShowLiveConnectingOverlay({
        hasRenderedFrame: false,
        stallMs: 0,
        isPlaying: true,
        isPaused: true,
      }),
    ).toBe(false);
  });
});

describe("hasLiveTimeAdvanced", () => {
  it("detects advancing playback time", () => {
    expect(hasLiveTimeAdvanced(10, 10.2)).toBe(true);
    expect(hasLiveTimeAdvanced(10, 10)).toBe(false);
  });
});
