import { describe, expect, it } from "vitest";

import { isRetryableHttpStatus, retryAfterMs } from "@/lib/client-fetch-retry";

describe("isRetryableHttpStatus", () => {
  it("treats 429/502/503 as retryable", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
  });
});

describe("retryAfterMs", () => {
  it("parses second deltas", () => {
    expect(retryAfterMs("2")).toBe(2000);
  });

  it("ignores HTTP-date values", () => {
    expect(retryAfterMs("Wed, 21 Oct 2015 07:28:00 GMT")).toBeNull();
  });
});
