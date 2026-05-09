import { describe, expect, it } from "vitest";

import { appendDiscoverHistory, MAX_DISCOVER_HISTORY } from "@/lib/qalb-discover-history";

describe("appendDiscoverHistory", () => {
  it("prepends and caps length", () => {
    const base = Array.from({ length: MAX_DISCOVER_HISTORY }, (_, i) => ({
      situationSnippet: `s${i}`,
      verseKeys: ["1:1"],
      at: i,
    }));
    const out = appendDiscoverHistory({ situationSnippet: "new", verseKeys: ["2:255"], at: 99 }, base);
    expect(out[0].situationSnippet).toBe("new");
    expect(out).toHaveLength(MAX_DISCOVER_HISTORY);
  });
});
