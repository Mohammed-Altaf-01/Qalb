import "server-only";

import { randomUUID } from "node:crypto";

import { apiLog } from "@/lib/logger";
import { runWithRequestContext } from "@/lib/request-context";

/**
 * Stable JSON error for clients — no stack traces.
 */
export function jsonError(message, status = 500, code = "internal_error") {
  return Response.json({ error: message, code }, { status });
}

function safePathname(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "";
  }
}

/** Log query param keys only (not values — may contain PII). */
function queryKeys(request) {
  try {
    const u = new URL(request.url);
    return [...u.searchParams.keys()].slice(0, 40);
  } catch {
    return [];
  }
}

/**
 * Wrap an App Route handler with request correlation + timing + error logging.
 * @param {(request: Request, context?: object) => Promise<Response>} handler
 */
export function withLoggedRoute(handler) {
  return async (request, routeContext) => {
    const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
    const started = Date.now();
    const pathname = safePathname(request);

    return runWithRequestContext({ requestId }, async () => {
      apiLog.info("route_start", {
        method: request.method,
        pathname,
        queryKeys: queryKeys(request),
      });

      try {
        const res = await handler(request, routeContext);
        apiLog.info("route_end", {
          method: request.method,
          pathname,
          status: res.status,
          durationMs: Date.now() - started,
        });
        const headers = new Headers(res.headers);
        headers.set("x-request-id", requestId);
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
      } catch (err) {
        apiLog.error("route_error", {
          err,
          method: request.method,
          pathname,
          durationMs: Date.now() - started,
        });
        return jsonError("An unexpected error occurred", 500, "internal_error");
      }
    });
  };
}
