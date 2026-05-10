import { describe, expect, it } from "vitest";

import { mergeBookmarksMap, mergeLibraryCollectionsPayload } from "@/lib/merge-user-app-storage";

describe("mergeBookmarksMap", () => {
  it("merges keys and picks newer bookmarkedAt", () => {
    const a = {
      "1:1": { verseKey: "1:1", bookmarkedAt: "2024-01-01T00:00:00.000Z" },
    };
    const b = {
      "1:1": { verseKey: "1:1", bookmarkedAt: "2025-01-01T00:00:00.000Z" },
      "2:255": { verseKey: "2:255", bookmarkedAt: "2025-02-01T00:00:00.000Z" },
    };
    const m = mergeBookmarksMap(a, b);
    expect(m["1:1"].bookmarkedAt).toBe(b["1:1"].bookmarkedAt);
    expect(m["2:255"]).toEqual(b["2:255"]);
  });
});

describe("mergeLibraryCollectionsPayload", () => {
  it("dedupes by id and keeps higher score", () => {
    const remote = {
      collections: [{ id: "a", name: "A", verses: ["1:1"], updatedAt: 10 }],
      updatedAt: 10,
    };
    const local = {
      collections: [{ id: "a", name: "A", verses: ["1:1", "2:2"], updatedAt: 20 }],
      updatedAt: 20,
    };
    const m = mergeLibraryCollectionsPayload(remote, local);
    expect(m.collections).toHaveLength(1);
    expect(m.collections[0].verses).toEqual(["1:1", "2:2"]);
  });
});
