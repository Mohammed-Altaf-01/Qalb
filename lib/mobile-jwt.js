/**
 * Short-lived HS256 JWT for native apps to call `/api/user/app-storage/*`
 * with `Authorization: Bearer …` when no browser cookie session exists.
 *
 * Implemented with Node `crypto` (no jose) for predictable behavior in Vitest + Next.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const MOBILE_CLAIM = "qalb_mobile";

function getSecretRaw() {
  const raw =
    process.env.MOBILE_SESSION_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  if (!raw || raw.length < 8) {
    throw new Error("Set MOBILE_SESSION_JWT_SECRET or NEXTAUTH_SECRET for mobile JWT signing");
  }
  return raw;
}

function b64url(bufOrStr) {
  const buf = Buffer.isBuffer(bufOrStr) ? bufOrStr : Buffer.from(bufOrStr, "utf8");
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeB64Url(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from((str + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * @param {string} userId — NextAuth session user id (Quran Foundation `sub`)
 * @param {number} [ttlSeconds] — default 30 days
 */
export async function signMobileSessionToken(userId, ttlSeconds = 30 * 24 * 60 * 60) {
  if (typeof userId !== "string" || !userId) {
    throw new Error("signMobileSessionToken: invalid userId");
  }
  const secret = getSecretRaw();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      [MOBILE_CLAIM]: true,
      iat: now,
      exp: now + ttlSeconds,
    }),
  );
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  const sigB64 = b64url(sig);
  return `${data}.${sigB64}`;
}

/**
 * @param {string | null | undefined} authorizationHeader — full `Authorization` header value
 * @returns {Promise<string | null>} user id or null
 */
export async function verifyMobileBearerUserId(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") return null;
  const m = authorizationHeader.match(/^\s*Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const secret = getSecretRaw();
  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  let sigBuf;
  try {
    sigBuf = decodeB64Url(s);
  } catch {
    return null;
  }
  if (sigBuf.length !== expected.length || !timingSafeEqual(sigBuf, expected)) return null;
  let body;
  try {
    const json = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    body = JSON.parse(json);
  } catch {
    return null;
  }
  if (body[MOBILE_CLAIM] !== true) return null;
  const exp = typeof body.exp === "number" ? body.exp : 0;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return typeof body.sub === "string" && body.sub ? body.sub : null;
}
