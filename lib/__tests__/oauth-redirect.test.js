import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";
import { getQuranFoundationOAuthRedirectUri, resolveAppOriginForNextAuth } from "@/lib/oauth-redirect";

const KEYS = [
  "QURAN_PRELIVE_REDIRECT_URI",
  "QURAN_OAUTH_REDIRECT_URI",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_URL",
];

describe("oauth-redirect", () => {
  const snapshot = {};

  beforeEach(() => {
    KEYS.forEach((k) => {
      snapshot[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    KEYS.forEach((k) => {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    });
  });

  it("prefers QURAN_PRELIVE_REDIRECT_URI and trims / trailing slash", () => {
    process.env.QURAN_PRELIVE_REDIRECT_URI = " https://app.example/oauth/callback/ ";
    expect(getQuranFoundationOAuthRedirectUri()).toBe("https://app.example/oauth/callback");
  });

  it("falls back to QURAN_OAUTH_REDIRECT_URI when prelive unset", () => {
    process.env.QURAN_OAUTH_REDIRECT_URI = "https://prod.example/cb";
    expect(getQuranFoundationOAuthRedirectUri()).toBe("https://prod.example/cb");
  });

  it("builds callback from NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000/";
    expect(getQuranFoundationOAuthRedirectUri()).toBe(
      `http://localhost:3000/api/auth/callback/${QURAN_FOUNDATION_PROVIDER_ID}`,
    );
  });

  it("builds callback from NEXT_PUBLIC_APP_URL when NEXTAUTH_URL unset", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://myapp.vercel.app";
    expect(getQuranFoundationOAuthRedirectUri()).toBe(
      `https://myapp.vercel.app/api/auth/callback/${QURAN_FOUNDATION_PROVIDER_ID}`,
    );
  });

  it("builds callback from VERCEL_URL when higher-priority origins unset", () => {
    process.env.VERCEL_URL = "proj-git-branch-user.vercel.app";
    expect(getQuranFoundationOAuthRedirectUri()).toBe(
      `https://proj-git-branch-user.vercel.app/api/auth/callback/${QURAN_FOUNDATION_PROVIDER_ID}`,
    );
  });

  it("resolveAppOriginForNextAuth prefers NEXTAUTH_URL over NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "https://wrong.example";
    expect(resolveAppOriginForNextAuth()).toBe("http://localhost:3000");
  });
});
