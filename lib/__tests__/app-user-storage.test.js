import { describe, expect, it } from "vitest";

import {
  isAppUserStorageNamespace,
  validateActivityMetadata,
  validateAppUserStoragePayload,
} from "@/lib/app-user-storage";
import { APP_USER_STORAGE_MAX_BYTES } from "@/lib/constants/app-user-storage";

describe("app-user-storage validation", () => {
  it("rejects unknown namespace", () => {
    expect(isAppUserStorageNamespace("nope")).toBe(false);
    const r = validateAppUserStoragePayload("nope", { a: 1 });
    expect(r.ok).toBe(false);
  });

  it("accepts valid namespace and object payload", () => {
    expect(isAppUserStorageNamespace("reading_progress")).toBe(true);
    const r = validateAppUserStoragePayload("reading_progress", { chapterId: 2, page: 1 });
    expect(r.ok).toBe(true);
  });

  it("accepts read_key_themes namespace", () => {
    expect(isAppUserStorageNamespace("read_key_themes")).toBe(true);
    const r = validateAppUserStoragePayload("read_key_themes", {
      themesBySurahId: { 1: { markdown: "Hi", updatedAt: 1 } },
    });
    expect(r.ok).toBe(true);
  });

  it("accepts listen_history namespace", () => {
    expect(isAppUserStorageNamespace("listen_history")).toBe(true);
    const r = validateAppUserStoragePayload("listen_history", {
      entries: [{ reciterId: 7, surahId: 2, positionSec: 10, updatedAt: 1 }],
      updatedAt: 1,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects oversized payload", () => {
    const big = "x".repeat(APP_USER_STORAGE_MAX_BYTES.preferences + 1);
    const r = validateAppUserStoragePayload("preferences", { blob: big });
    expect(r.ok).toBe(false);
  });

  it("validateActivityMetadata accepts empty", () => {
    expect(validateActivityMetadata(undefined).ok).toBe(true);
  });
});
