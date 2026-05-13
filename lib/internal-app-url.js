import { headers } from "next/headers";

/**
 * Computes the public origin for same-origin fetches from Server Components.
 * Avoids broken loopback when `NEXT_PUBLIC_APP_URL` is unset, or the app runs on a non-3000 port.
 *
 * @param {{ host: string; forwardedProto?: string; nextPublicAppUrl?: string; vercel?: boolean }} input
 * @returns {string} Origin without trailing slash
 */
/** Detect loopback origins that have no HTTP server during `next build`. */
export function isLoopbackHttpOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  try {
    const u = new URL(origin);
    const h = (u.hostname || "").toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

/** Self-fetch during `next build` to loopback hangs (no dev server). Skip and let the client load instead. */
export function shouldDeferLoopbackSelfFetchDuringBuild(origin) {
  return isLoopbackHttpOrigin(origin) && process.env.NEXT_PHASE === "phase-production-build";
}

export function resolveInternalAppOrigin(input) {
  const host = input.host?.trim() ?? "";
  if (host) {
    const firstProto = input.forwardedProto?.split(",")[0]?.trim();
    const proto = firstProto === "http" || firstProto === "https" ? firstProto : input.vercel ? "https" : "http";
    return `${proto}://${host}`;
  }
  const env = input.nextPublicAppUrl?.replace(/\/$/, "").trim();
  if (env) return env;
  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

/** Use the incoming request host/proto (Vercel-safe) so SSR can reach our own API routes. */
export async function getInternalAppOrigin() {
  const h = await headers();
  return resolveInternalAppOrigin({
    host: h.get("x-forwarded-host") ?? h.get("host") ?? "",
    forwardedProto: h.get("x-forwarded-proto") ?? "",
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    vercel: Boolean(process.env.VERCEL),
  });
}
