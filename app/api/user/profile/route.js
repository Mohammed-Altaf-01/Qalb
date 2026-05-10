import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

/** GET current user's app profile row (last_seen, metadata). */
export const GET = withLoggedRoute(async () => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ enabled: false, profile: null });
  }

  const { data, error } = await supabase.from("app_user_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    apiLog.error("user_profile_failed", { err: error });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  return NextResponse.json({ enabled: true, profile: data ?? null });
});
