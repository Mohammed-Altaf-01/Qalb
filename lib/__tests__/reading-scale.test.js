import { describe, expect, it } from "vitest";

import { normalizeReadingScale, READING_SCALE_IDS, READING_SCALE_MULTIPLIERS } from "../reading-scale.js";

describe("reading-scale", () => {
  it("normalizeReadingScale falls back to comfortable", () => {
    expect(normalizeReadingScale(undefined)).toBe("comfortable");
    expect(normalizeReadingScale("")).toBe("comfortable");
    expect(normalizeReadingScale("xlarge")).toBe("comfortable");
  });

  it("accepts known ids", () => {
    for (const id of READING_SCALE_IDS) {
      expect(normalizeReadingScale(id)).toBe(id);
      expect(typeof READING_SCALE_MULTIPLIERS[id]).toBe("number");
    }
  });
});
