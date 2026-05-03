/**
 * Validation helpers for app_user_storage API (pure, no Supabase imports).
 */
import {
  APP_USER_STORAGE_MAX_BYTES,
  APP_USER_STORAGE_NAMESPACES,
  USER_ACTIVITY_MAX_METADATA_BYTES,
} from "@/lib/constants/app-user-storage";

const NS_SET = new Set(APP_USER_STORAGE_NAMESPACES);

export function isAppUserStorageNamespace(value) {
  return typeof value === "string" && NS_SET.has(value);
}

export function maxBytesForNamespace(namespace) {
  return APP_USER_STORAGE_MAX_BYTES[namespace] ?? APP_USER_STORAGE_MAX_BYTES.default;
}

/**
 * @param {string} namespace
 * @param {unknown} payload
 * @returns {{ ok: true, payload: object } | { ok: false, error: string }}
 */
export function validateAppUserStoragePayload(namespace, payload) {
  if (!isAppUserStorageNamespace(namespace)) {
    return { ok: false, error: "Invalid namespace" };
  }
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Payload must be a JSON object" };
  }
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch {
    return { ok: false, error: "Payload is not serializable" };
  }
  const max = maxBytesForNamespace(namespace);
  if (serialized.length > max) {
    return { ok: false, error: `Payload exceeds max size (${max} bytes)` };
  }
  return { ok: true, payload };
}

/**
 * @param {unknown} metadata
 * @returns {{ ok: true, metadata: object } | { ok: false, error: string }}
 */
export function validateActivityMetadata(metadata) {
  if (metadata == null) return { ok: true, metadata: {} };
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ok: false, error: "metadata must be a JSON object" };
  }
  let serialized;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    return { ok: false, error: "metadata is not serializable" };
  }
  if (serialized.length > USER_ACTIVITY_MAX_METADATA_BYTES) {
    return { ok: false, error: "metadata too large" };
  }
  return { ok: true, metadata };
}
