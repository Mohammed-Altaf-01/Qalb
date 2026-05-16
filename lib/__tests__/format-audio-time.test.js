import { describe, expect, it } from "vitest";

import { formatAudioTime } from "../format-audio-time";

describe("formatAudioTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatAudioTime(496)).toBe("8:16");
  });

  it("formats hours for long tracks", () => {
    expect(formatAudioTime(4761)).toBe("1:19:21");
  });

  it("handles invalid input", () => {
    expect(formatAudioTime(NaN)).toBe("0:00");
    expect(formatAudioTime(-1)).toBe("0:00");
  });
});
