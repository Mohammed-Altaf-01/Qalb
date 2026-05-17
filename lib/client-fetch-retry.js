/**
 * Client fetch helper — retries transient rate limits / gateway errors.
 */

/** @param {number} status */
export function isRetryableHttpStatus(status) {
  return status === 429 || status === 502 || status === 503;
}

/**
 * Parse Retry-After when it is a delay in seconds (not an HTTP-date).
 * @param {string | null | undefined} header
 * @returns {number | null} milliseconds
 */
export function retryAfterMs(header) {
  if (!header) return null;
  const trimmed = header.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const seconds = parseInt(trimmed, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(seconds * 1000, 60_000);
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ maxAttempts?: number; initialDelayMs?: number }} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, init, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  let delayMs = options.initialDelayMs ?? 600;
  /** @type {Response | null} */
  let lastRes = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, init);
    lastRes = res;
    if (res.ok) return res;
    if (!isRetryableHttpStatus(res.status) || attempt >= maxAttempts - 1) return res;

    const fromHeader = retryAfterMs(res.headers.get("Retry-After"));
    const wait = fromHeader ?? delayMs;
    await new Promise((resolve) => setTimeout(resolve, wait));
    delayMs = Math.min(delayMs * 2, 8000);
  }

  return lastRes;
}
