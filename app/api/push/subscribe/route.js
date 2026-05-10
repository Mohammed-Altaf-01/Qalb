import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

export const POST = withLoggedRoute(async (request) => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const sb = getSupabaseServiceRole();
  if (!sb) return NextResponse.json({ error: "Push storage unavailable" }, { status: 503 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint.startsWith("https://") || endpoint.length > 7800) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const keys = body.keys && typeof body.keys === "object" ? body.keys : {};
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.slice(0, 500) : null;
  const auth = typeof keys?.auth === "string" ? keys.auth.slice(0, 200) : null;

  try {
    const { error } = await sb.from("push_subscriptions").upsert(
      {
        user_id: String(userId),
        endpoint,
        p256dh,
        auth,
        timezone_hint: typeof body.timezone_hint === "string" ? body.timezone_hint.slice(0, 80) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    apiLog.error("push_subscribe_upsert_failed", { err: e });
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
});
