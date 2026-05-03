/**
 * Server-only Supabase client (service role). Never import from client components.
 */
import { createClient } from "@supabase/supabase-js";

let cached = null;

/**
 * @returns {import("@supabase/supabase-js").SupabaseClient | null}
 */
export function getSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
