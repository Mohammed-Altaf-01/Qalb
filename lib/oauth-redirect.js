/**
 * Resolves the OAuth redirect_uri sent to Quran Foundation (Hydra).
 * Must match a pre-registered callback URL on the client (byte-for-byte).
 *
 * @see https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2/
 */
import { DEFAULT_APP_ORIGIN, QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";

function stripTrailingSlash(url) {
  return (url ?? "").trim().replace(/\/+$/, "");
}

/**
 * App origin used to build the default NextAuth callback URL.
 * Order: NEXTAUTH_URL → NEXT_PUBLIC_APP_URL → https://VERCEL_URL → default localhost.
 *
 * @returns {string} Origin without trailing slash
 */
export function resolveAppOriginForNextAuth() {
  if (process.env.NODE_ENV === "development") {
    const localNextAuth = stripTrailingSlash(process.env.NEXTAUTH_URL);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(localNextAuth)) return localNextAuth;

    const localPublic = stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(localPublic)) return localPublic;

    return stripTrailingSlash(DEFAULT_APP_ORIGIN);
  }

  if (process.env.NEXTAUTH_URL) return stripTrailingSlash(process.env.NEXTAUTH_URL);
  if (process.env.NEXT_PUBLIC_APP_URL) return stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) return stripTrailingSlash(`https://${process.env.VERCEL_URL}`);
  return stripTrailingSlash(DEFAULT_APP_ORIGIN);
}

/**
 * Full redirect_uri for the Quran Foundation OAuth provider (NextAuth callback route).
 *
 * @returns {string}
 */
export function getQuranFoundationOAuthRedirectUri() {
  const explicit = process.env.QURAN_PRELIVE_REDIRECT_URI?.trim() || process.env.QURAN_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const origin = resolveAppOriginForNextAuth();
  return `${origin}/api/auth/callback/${QURAN_FOUNDATION_PROVIDER_ID}`;
}
