import { describe, expect, it } from "vitest";

import { redactHeaders, truncateForLog } from "@/lib/logger";

describe("logger helpers", () => {
  it("redacts sensitive headers", () => {
    const out = redactHeaders({
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
      cookie: "a=b",
    });
    expect(out.Authorization).toBe("[redacted]");
    expect(out.cookie).toBe("[redacted]");
    expect(out["Content-Type"]).toBe("application/json");
  });

  it("truncates long payloads", () => {
    const s = "x".repeat(3000);
    expect(truncateForLog(s, 100).length).toBeLessThan(200);
    expect(truncateForLog(s, 100)).toContain("truncated");
  });
});
