import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { validateActivityMetadata } from "@/lib/app-user-storage";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { insertUserActivityEvent, listUserActivityEvents } from "@/lib/supabase-app-user-repository";

const MAX_EVENT_TYPE_LEN = 120;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  if (!getSupabaseServiceRole()) {
    return NextResponse.json({ enabled: false, events: [] });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "365", 10), 1), 730);
  const fromIso = new Date(Date.now() - days * 86_400_000).toISOString();

  const result = await listUserActivityEvents(userId, { fromIso, limit: 20_000 });
  if (!result.ok) {
    console.error("[/api/user/activity GET]", result.error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }

  return NextResponse.json({ enabled: true, events: result.events });
}

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
