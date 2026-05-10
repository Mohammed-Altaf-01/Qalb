import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signMobileSessionToken, verifyMobileBearerUserId } from "@/lib/mobile-jwt";

describe("mobile-jwt", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "x".repeat(32);
    delete process.env.MOBILE_SESSION_JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("round-trips user id in Bearer header", async () => {
    const token = await signMobileSessionToken("user-abc-123");
    const uid = await verifyMobileBearerUserId(`Bearer ${token}`);
    expect(uid).toBe("user-abc-123");
  });

  it("returns null for invalid token", async () => {
    expect(await verifyMobileBearerUserId("Bearer not-a-jwt")).toBeNull();
    expect(await verifyMobileBearerUserId(null)).toBeNull();
  });
});
