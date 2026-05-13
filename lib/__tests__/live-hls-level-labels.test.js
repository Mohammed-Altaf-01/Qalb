import { describe, expect, it } from "vitest";

import {
  buildLiveHlsQualityLevelOptions,
  clampLiveHlsUserLevel,
  defaultLiveHlsManualLevelIndex,
  formatLiveHlsLevelLabel,
} from "../live-hls-level-labels";

describe("formatLiveHlsLevelLabel", () => {
  it("prefers height as ~Np", () => {
    expect(formatLiveHlsLevelLabel({ height: 384, width: 480 })).toBe("~384p");
  });

  it("falls back to bitrate when no dimensions", () => {
    expect(formatLiveHlsLevelLabel({ bitrate: 453_000 })).toBe("~453 kbps");
  });

  it("uses width when height missing", () => {
    expect(formatLiveHlsLevelLabel({ width: 640 })).toBe("~640×?");
  });
});

describe("buildLiveHlsQualityLevelOptions", () => {
  it("maps each level with index and label", () => {
    const hls = { levels: [{ height: 256 }, { height: 384, bitrate: 861_000 }] };
    expect(buildLiveHlsQualityLevelOptions(hls)).toEqual([
      { value: 0, label: "~256p" },
      { value: 1, label: "~384p" },
    ]);
  });

  it("returns empty when no levels", () => {
    expect(buildLiveHlsQualityLevelOptions(null)).toEqual([]);
    expect(buildLiveHlsQualityLevelOptions({ levels: [] })).toEqual([]);
  });
});

describe("defaultLiveHlsManualLevelIndex", () => {
  it("picks ~384p height band", () => {
    const hls = { levels: [{ height: 256 }, { height: 384 }] };
    expect(defaultLiveHlsManualLevelIndex(hls)).toBe(1);
  });

  it("falls back to last level when no 360–420 height", () => {
    const hls = { levels: [{ height: 144 }, { height: 240 }] };
    expect(defaultLiveHlsManualLevelIndex(hls)).toBe(1);
  });
});

describe("clampLiveHlsUserLevel", () => {
  it("preserves auto", () => {
    expect(clampLiveHlsUserLevel(-1, 2)).toBe(-1);
  });

  it("clamps high index to max", () => {
    expect(clampLiveHlsUserLevel(5, 2)).toBe(1);
  });
});
