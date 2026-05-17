import { NextResponse } from "next/server";

/** @type {Map<string, { count: number; resetAt: number }>} */
const buckets = new Map();

const WINDOW_MS = 60_000;
const GLOBAL_LIMIT = 200;
const CONTENT_LIMIT = 480;
const USER_LIMIT = 90;
const AI_LIMIT = 24;

function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function allow(bucketKey, limit) {
  const now = Date.now();
  let b = buckets.get(bucketKey);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(bucketKey, b);
  }
  b.count += 1;
  if (b.count > limit) return false;
  return true;
}

function rateLimitBucket(pathname) {
  if (pathname.startsWith("/api/ai")) return { key: "ai", limit: AI_LIMIT };
  if (pathname.startsWith("/api/verse") || pathname.startsWith("/api/quran")) {
    return { key: "content", limit: CONTENT_LIMIT };
  }
  if (pathname.startsWith("/api/user")) return { key: "user", limit: USER_LIMIT };
  return { key: "global", limit: GLOBAL_LIMIT };
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Never throttle NextAuth — session checks share the global bucket and break sign-in UX.
  if (pathname.startsWith("/api/auth")) {
    const requestId = crypto.randomUUID();
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const ip = clientIp(request);
  const { key, limit } = rateLimitBucket(pathname);

  if (!allow(`${ip}:${key}`, limit)) {
    return NextResponse.json(
      { error: "Too many requests", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  }

  const requestId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-request-id", requestId);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
