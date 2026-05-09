import { describe, expect, it } from "vitest";

import { READ_RECITERS } from "@/lib/read-reciters";

describe("read-reciters", () => {
  it("lists reciters supported by verse audio API", () => {
    expect(READ_RECITERS.length).toBeGreaterThanOrEqual(4);
    expect(READ_RECITERS.some((r) => r.id === 7)).toBe(true);
  });
});
