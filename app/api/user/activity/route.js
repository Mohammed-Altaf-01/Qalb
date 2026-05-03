import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { validateActivityMetadata } from "@/lib/app-user-storage";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { insertUserActivityEvent } from "@/lib/supabase-app-user-repository";

const MAX_EVENT_TYPE_LEN = 120;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  if (!getSupabaseServiceRole()) {
    return NextResponse.json({ error: "Activity logging is not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = typeof body?.event_type === "string" ? body.event_type.trim() : "";
  if (!eventType || eventType.length > MAX_EVENT_TYPE_LEN) {
    return NextResponse.json({ error: "event_type is required (string, max 120 chars)" }, { status: 400 });
  }

  const meta = validateActivityMetadata(body?.metadata);
  if (!meta.ok) {
    return NextResponse.json({ error: meta.error }, { status: 400 });
  }

  const result = await insertUserActivityEvent(userId, eventType, meta.metadata);
  if (!result.ok) {
    console.error("[/api/user/activity POST]", result.error);
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
