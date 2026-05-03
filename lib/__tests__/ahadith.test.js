import { describe, expect, it } from "vitest";

import {
  AHADITH_COLLECTION,
  HOME_AHADITH_PREVIEW_COUNT,
  getAhadithById,
  getHomeAhadithPreview,
} from "@/lib/constants/ahadith";

describe("ahadith constants", () => {
  it("exposes a non-empty collection with required fields", () => {
    expect(AHADITH_COLLECTION.length).toBeGreaterThanOrEqual(HOME_AHADITH_PREVIEW_COUNT);
    for (const h of AHADITH_COLLECTION) {
      expect(h.id).toBeTruthy();
      expect(h.title).toBeTruthy();
      expect(h.arabic).toBeTruthy();
      expect(h.translation).toBeTruthy();
      expect(h.source).toBeTruthy();
    }
  });

  it("preview is a prefix of the collection", () => {
    const preview = getHomeAhadithPreview();
    expect(preview).toHaveLength(HOME_AHADITH_PREVIEW_COUNT);
    expect(preview[0]).toEqual(AHADITH_COLLECTION[0]);
  });

  it("getAhadithById finds known entries", () => {
    expect(getAhadithById("intentions")?.title).toBe("Actions are by intentions");
    expect(getAhadithById("missing")).toBeUndefined();
  });
});
