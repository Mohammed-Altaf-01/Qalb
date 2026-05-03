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
