import { describe, expect, it } from "vitest";

import { preferredMoshafEntry } from "../mp3quran-moshaf";

describe("preferredMoshafEntry", () => {
  it("returns moshaf_type 0 when present", () => {
    const list = [
      { moshaf_type: 11, server: "https://a/", surah_list: "1" },
      { moshaf_type: 0, server: "https://legacy/", surah_list: "1" },
    ];
    expect(preferredMoshafEntry(list)?.server).toBe("https://legacy/");
  });

  it("falls back to rewaya_id 1 when no type 0", () => {
    const list = [
      { moshaf_type: 222, rewaya_id: 22, server: "https://mojawwad/", surah_list: "1" },
      { moshaf_type: 11, rewaya_id: 1, server: "https://murattal/", surah_list: "1,2" },
    ];
    expect(preferredMoshafEntry(list)?.server).toBe("https://murattal/");
  });

  it("uses first entry when no heuristics match", () => {
    const list = [{ moshaf_type: 99, server: "https://only/", surah_list: "1" }];
    expect(preferredMoshafEntry(list)?.server).toBe("https://only/");
  });
});
