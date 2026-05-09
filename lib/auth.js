/**
 * NextAuth configuration — Quran Foundation OAuth2 PKCE provider.
 *
 * Flow: authorization_code + PKCE (S256) + state check.
 * Token refresh is handled automatically in the jwt callback.
 * Session exposes accessToken so server/client components can call User APIs.
 */
import NextAuth from "next-auth";

import { QURAN_FOUNDATION_PROVIDER_ID } from "@/lib/constants/auth";
import { getQuranFoundationOAuthRedirectUri } from "@/lib/oauth-redirect";

function resolveOAuthConfig() {
  const prelive = {
    oauthBase: process.env.QURAN_PRELIVE_OAUTH_ENDPOINT,
    clientId: process.env.QURAN_PRELIVE_CLIENT_ID,
    clientSecret: process.env.QURAN_PRELIVE_CLIENT_SECRET,
  };
  const prod = {
    oauthBase: process.env.QURAN_OAUTH_ENDPOINT,
    clientId: process.env.QURAN_CLIENT_ID,
    clientSecret: process.env.QURAN_CLIENT_SECRET,
  };

  const hasFullPrelive = Boolean(prelive.oauthBase && prelive.clientId && prelive.clientSecret);
  if (hasFullPrelive) return prelive;
  return prod;
}

const { oauthBase: OAUTH_BASE, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET } = resolveOAuthConfig();
/** Must match a pre-registered redirect on the OAuth client; see sample.oauth.env */
const AUTH_REDIRECT_URI = getQuranFoundationOAuthRedirectUri();

// Scopes per User APIs quickstart (least privilege; add more only if provisioned on the client)
const SCOPES = [
  "offline_access",
  "user",
  "bookmark",
  "collection",
  "reading_session",
  "goal",
  "streak",
  "preference",
].join(" ");

async function refreshAccessToken(token) {
  try {
    const res = await fetch(`${OAUTH_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw data;

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions = {
  trustHost: true,
  providers: [
    {
      id: QURAN_FOUNDATION_PROVIDER_ID,
      name: "Quran Foundation",
      type: "oauth",
      authorization: {
        url: `${OAUTH_BASE}/oauth2/auth`,
        params: {
          scope: SCOPES,
          response_type: "code",
          redirect_uri: AUTH_REDIRECT_URI,
        },
      },
      token: {
        url: `${OAUTH_BASE}/oauth2/token`,
        params: {
          redirect_uri: AUTH_REDIRECT_URI,
        },
      },
      userinfo: `${OAUTH_BASE}/userinfo`,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      checks: ["pkce", "state"],
      idToken: false,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username ?? profile.email?.split("@")[0] ?? "Reader",
          email: profile.email ?? null,
          image: profile.picture ?? null,
          firstName: profile.first_name ?? null,
          lastName: profile.last_name ?? null,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // First sign-in: persist tokens in the JWT
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          userId: user.id,
          firstName: user.firstName ?? token.firstName ?? null,
          lastName: user.lastName ?? token.lastName ?? null,
        };
      }

      // Token still valid (with 60 s buffer)
      if (Date.now() < (token.expiresAt ?? 0) * 1000 - 60_000) {
        return token;
      }

      // Token expired — refresh
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.userId ?? token.sub;
      session.user.firstName = token.firstName ?? null;
      session.user.lastName = token.lastName ?? null;
      session.error = token.error;
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
  },

  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
