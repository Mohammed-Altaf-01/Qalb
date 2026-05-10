import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { GAMIFICATION_SYNC_MAX_BODY_BYTES } from "@/lib/constants/gamification";
import { normalizeGamificationState } from "@/lib/gamification";
import { verifyMobileBearerUserId } from "@/lib/mobile-jwt";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { touchAppUserProfile } from "@/lib/supabase-app-user-repository";

async function resolveUserId(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;
  return verifyMobileBearerUserId(request.headers.get("authorization"));
}

function isNormalizedGamificationState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) return false;
  if (typeof state.xp !== "number" || !Number.isFinite(state.xp) || state.xp < 0) return false;
  if (!Array.isArray(state.badges)) return false;
  if (!Array.isArray(state.actionLog)) return false;
  if (!Array.isArray(state.deeds)) return false;
  if (state.actionsToday != null && typeof state.actionsToday !== "object") return false;
  return true;
}

export const GET = withLoggedRoute(async (request) => {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ enabled: false, state: null });
  }

  const { data, error } = await supabase.from("user_gamification").select("state").eq("user_id", userId).maybeSingle();

  if (error) {
    apiLog.error("gamification_get_failed", { err: error });
    return NextResponse.json({ error: "Failed to load gamification" }, { status: 500 });
  }

  void touchAppUserProfile(userId);
  return NextResponse.json({ enabled: true, state: data?.state ?? null });
});

export const PATCH = withLoggedRoute(async (request) => {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json({ error: "Gamification sync is not configured" }, { status: 503 });
  }

  const rawText = await request.text();
  if (rawText.length > GAMIFICATION_SYNC_MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body;
  try {
    body = JSON.parse(rawText || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body?.state;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const normalized = normalizeGamificationState(raw);
  if (!isNormalizedGamificationState(normalized)) {
    return NextResponse.json({ error: "Invalid state shape" }, { status: 400 });
  }
  const now = new Date().toISOString();

  const { error } = await supabase.from("user_gamification").upsert(
    {
      user_id: userId,
      state: normalized,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    apiLog.error("gamification_patch_failed", { err: error });
    return NextResponse.json({ error: "Failed to save gamification" }, { status: 500 });
  }

  void touchAppUserProfile(userId);
  return NextResponse.json({ ok: true, state: normalized });
});
