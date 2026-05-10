/**
 * Structured logging — **server-only**. Import `@/lib/logger-client` from Client Components.
 *
 * Merges `requestId` from `runWithRequestContext` when available (Node API routes).
 */

import "server-only";

import { getRequestId } from "@/lib/request-context";

const LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 };

function envLogLevel() {
  const raw = typeof process !== "undefined" ? process.env.LOG_LEVEL : undefined;
  if (raw && LEVEL_RANK[raw] != null) return raw;
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return "info";
  return "debug";
}

function shouldEmit(level) {
  const min = envLogLevel();
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

/**
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
export function redactHeaders(headers) {
  const out = { ...headers };
  const redact = ["authorization", "cookie", "set-cookie", "x-auth-token"];
  for (const k of Object.keys(out)) {
    if (redact.includes(k.toLowerCase())) out[k] = "[redacted]";
  }
  return out;
}

/**
 * @param {unknown} data
 * @param {number} [max=2048]
 */
export function truncateForLog(data, max = 2048) {
  try {
    const s = typeof data === "string" ? data : JSON.stringify(data);
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…[truncated ${s.length - max} chars]`;
  } catch {
    return "[unserializable]";
  }
}

/**
 * @param {string} level
 * @param {string} scope
 * @param {string} msg
 * @param {Record<string, unknown>} [extra]
 */
function emit(level, scope, msg, extra = {}) {
  if (!shouldEmit(level)) return;

  const requestId = safeRequestId();
  const line = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(requestId ? { requestId } : {}),
    ...sanitizeExtra(extra),
  };

  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

function safeRequestId() {
  try {
    return getRequestId();
  } catch {
    return undefined;
  }
}

/** Strip Error objects to serializable form */
function sanitizeExtra(extra) {
  const out = { ...extra };
  if (out.err instanceof Error) {
    out.errorName = out.err.name;
    out.errorMessage = out.err.message;
    out.stack = out.err.stack;
    delete out.err;
  }
  return out;
}

/** @param {string} scope e.g. "quran-api" */
export function createLogger(scope) {
  return {
    debug: (msg, extra) => emit("debug", scope, msg, extra ?? {}),
    info: (msg, extra) => emit("info", scope, msg, extra ?? {}),
    warn: (msg, extra) => emit("warn", scope, msg, extra ?? {}),
    error: (msg, extra) => emit("error", scope, msg, extra ?? {}),
  };
}

export const apiLog = createLogger("api");
export const quranApiLog = createLogger("quran-api");
export const userApiLog = createLogger("user-api");
export const aiLog = createLogger("ai");
export const syncLog = createLogger("sync-bridge");
