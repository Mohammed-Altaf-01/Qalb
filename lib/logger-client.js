"use client";

/**
 * Browser-safe helpers — no `async_hooks`. Use `clientDebug` for gated verbose traces.
 */

const LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 };

function envLogLevel() {
  const raw = process.env.LOG_LEVEL;
  if (raw && LEVEL_RANK[raw] != null) return raw;
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

function shouldEmit(level) {
  const min = envLogLevel();
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

function sanitizeExtra(extra) {
  const out = { ...extra };
  if (out.err instanceof Error) {
    out.errorMessage = out.err.message;
    delete out.err;
  }
  return out;
}

/**
 * High-level traces only — never raw API bodies or tokens.
 */
export function clientDebug(scope, msg, extra = {}) {
  const allow = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";
  if (!allow || !shouldEmit("debug")) return;
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "debug",
      scope,
      msg,
      ...sanitizeExtra(extra),
    }),
  );
}

export function clientWarn(scope, msg, extra = {}) {
  if (!shouldEmit("warn")) return;
  console.warn(JSON.stringify({ ts: new Date().toISOString(), scope, msg, ...sanitizeExtra(extra) }));
}

export function clientError(scope, msg, extra = {}) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), scope, msg, ...sanitizeExtra(extra) }));
}
