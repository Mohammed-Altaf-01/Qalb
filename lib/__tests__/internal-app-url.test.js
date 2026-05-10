import { afterEach, describe, expect, it } from "vitest";

import {
  isLoopbackHttpOrigin,
  resolveInternalAppOrigin,
  shouldDeferLoopbackSelfFetchDuringBuild,
} from "../internal-app-url";

describe("resolveInternalAppOrigin", () => {
  it("prefers x-forwarded-host with forwarded proto", () => {
    expect(
      resolveInternalAppOrigin({
        host: "qalb.example.com",
        forwardedProto: "https",
      }),
    ).toBe("https://qalb.example.com");
  });

  it("uses first proto when forwarded value is a list", () => {
    expect(
      resolveInternalAppOrigin({
        host: "app.vercel.app",
        forwardedProto: "https, http",
      }),
    ).toBe("https://app.vercel.app");
  });

  it("defaults to https on Vercel when proto missing", () => {
    expect(
      resolveInternalAppOrigin({
        host: "x.vercel.app",
        forwardedProto: "",
        vercel: true,
      }),
    ).toBe("https://x.vercel.app");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when host missing", () => {
    expect(
      resolveInternalAppOrigin({
        host: "",
        nextPublicAppUrl: "https://custom.example/",
      }),
    ).toBe("https://custom.example");
  });
});

describe("isLoopbackHttpOrigin", () => {
  it("detects localhost and 127.0.0.1", () => {
    expect(isLoopbackHttpOrigin("http://localhost:3000")).toBe(true);
    expect(isLoopbackHttpOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackHttpOrigin("https://example.com")).toBe(false);
  });
});

describe("shouldDeferLoopbackSelfFetchDuringBuild", () => {
  afterEach(() => {
    delete process.env.NEXT_PHASE;
  });

  it("is true for loopback only during production build phase", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    expect(shouldDeferLoopbackSelfFetchDuringBuild("http://127.0.0.1:3000")).toBe(true);
    expect(shouldDeferLoopbackSelfFetchDuringBuild("https://app.example")).toBe(false);
  });

  it("is false when not in build phase", () => {
    delete process.env.NEXT_PHASE;
    expect(shouldDeferLoopbackSelfFetchDuringBuild("http://127.0.0.1:3000")).toBe(false);
  });
});
