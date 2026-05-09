/**
 * Repository for app_user_profiles, app_user_storage, user_activity_events.
 * Server-only; requires getSupabaseServiceRole().
 */
import { getSupabaseServiceRole } from "@/lib/supabase-server";

/**
 * Upsert a lightweight profile row and bump last_seen_at.
 * @param {string} userId
 */
export async function touchAppUserProfile(userId) {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const now = new Date().toISOString();
  const { data: existing } = await supabase.from("app_user_profiles").select("metadata").eq("user_id", userId).maybeSingle();

  const { error } = await supabase.from("app_user_profiles").upsert(
    {
      user_id: userId,
      last_seen_at: now,
      metadata: existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {},
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {string} namespace
 * @returns {Promise<{ ok: true, payload: object | null } | { ok: false, error: string }>}
 */
export async function getAppUserStoragePayload(userId, namespace) {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("app_user_storage")
    .select("payload")
    .eq("user_id", userId)
    .eq("namespace", namespace)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, payload: data?.payload ?? null };
}

/**
 * Full replace of payload for (userId, namespace).
 * @param {string} userId
 * @param {string} namespace
 * @param {object} payload
 */
export async function upsertAppUserStoragePayload(userId, namespace, payload) {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("app_user_storage").upsert(
    {
      user_id: userId,
      namespace,
      payload,
      updated_at: now,
    },
    { onConflict: "user_id,namespace" },
  );

  if (error) return { ok: false, error: error.message };
  await touchAppUserProfile(userId);
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {string} eventType
 * @param {object} metadata
 */
export async function insertUserActivityEvent(userId, eventType, metadata) {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const { error } = await supabase.from("user_activity_events").insert({
    user_id: userId,
    event_type: eventType,
    metadata,
  });

  if (error) return { ok: false, error: error.message };
  await touchAppUserProfile(userId);
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {{ fromIso?: string, toIso?: string, limit?: number }} [opts]
 */
export async function listUserActivityEvents(userId, opts = {}) {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const fromIso = opts.fromIso ?? new Date(Date.now() - 365 * 86_400_000).toISOString();
  const toIso = opts.toIso ?? new Date().toISOString();
  const limit = Math.min(Math.max(opts.limit ?? 10_000, 1), 20_000);

  const { data, error } = await supabase
    .from("user_activity_events")
    .select("event_type, metadata, created_at")
    .eq("user_id", userId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return { ok: false, error: error.message };
  return { ok: true, events: data ?? [] };
}
