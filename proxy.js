import { NextResponse } from "next/server";

/** @type {Map<string, { count: number; resetAt: number }>} */
const buckets = new Map();

const WINDOW_MS = 60_000;
const GLOBAL_LIMIT = 180;
const AI_LIMIT = 24;

function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function allow(ip, limit) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  if (b.count > limit) return false;
  return true;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const ip = clientIp(request);
  const isAi = pathname.startsWith("/api/ai");
  const limit = isAi ? AI_LIMIT : GLOBAL_LIMIT;

  if (!allow(ip, limit)) {
    return NextResponse.json({ error: "Too many requests", code: "rate_limited" }, { status: 429 });
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
