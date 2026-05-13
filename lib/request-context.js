/**
 * Async request context for correlating logs within a single API invocation (Node runtime).
 */
import { AsyncLocalStorage } from "node:async_hooks";

/** @typedef {{ requestId?: string }} RequestContextStore */

/** @type {AsyncLocalStorage<RequestContextStore>} */
const storage = new AsyncLocalStorage();

/**
 * @param {RequestContextStore} store
 * @param {() => Promise<Response>} fn
 */
export function runWithRequestContext(store, fn) {
  return storage.run(store, fn);
}

/** @returns {RequestContextStore | undefined} */
export function getRequestContext() {
  return storage.getStore();
}

export function getRequestId() {
  return getRequestContext()?.requestId;
}
