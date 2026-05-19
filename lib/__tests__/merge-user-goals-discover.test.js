import { describe, expect, it } from "vitest";

import { mergeDiscoverHistory, mergeReadingGoals } from "../merge-user-app-storage.js";

describe("mergeReadingGoals", () => {
  it("merges by id and keeps newer createdAt", () => {
    const remote = [{ id: "1", label: "Remote", createdAt: "2026-05-20T00:00:00.000Z", progress: 2 }];
    const local = [{ id: "1", label: "Local", createdAt: "2026-05-19T00:00:00.000Z", progress: 1 }];
    const merged = mergeReadingGoals(remote, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].label).toBe("Remote");
    expect(merged[0].progress).toBe(2);
  });

  it("appends local-only goals", () => {
    const merged = mergeReadingGoals([], [{ id: "a", label: "Only local", createdAt: Date.now() }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("a");
  });
});

describe("mergeDiscoverHistory", () => {
  it("dedupes and sorts by at descending", () => {
    const remote = [{ situationSnippet: "patience", verseKeys: ["2:153"], at: 100 }];
    const local = [{ situationSnippet: "hope", verseKeys: ["12:87"], at: 200 }];
    const merged = mergeDiscoverHistory(remote, local);
    expect(merged[0].situationSnippet).toBe("hope");
    expect(merged).toHaveLength(2);
  });
});
