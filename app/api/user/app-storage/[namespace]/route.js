import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { isAppUserStorageNamespace, validateAppUserStoragePayload } from "@/lib/app-user-storage";
import { verifyMobileBearerUserId } from "@/lib/mobile-jwt";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { getAppUserStoragePayload, touchAppUserProfile, upsertAppUserStoragePayload } from "@/lib/supabase-app-user-repository";

async function resolveUserId(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;
  return verifyMobileBearerUserId(request.headers.get("authorization"));
}

export const GET = withLoggedRoute(async (request, context) => {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const params = await Promise.resolve(context.params);
  const namespace = params?.namespace;
  if (!isAppUserStorageNamespace(namespace)) {
    return NextResponse.json({ error: "Unknown namespace" }, { status: 404 });
  }

  if (!getSupabaseServiceRole()) {
    return NextResponse.json({ enabled: false, payload: null });
  }

  const result = await getAppUserStoragePayload(userId, namespace);
  if (!result.ok) {
    apiLog.error("app_storage_get_failed", { namespace, err: result.error });
    return NextResponse.json({ error: "Failed to load storage" }, { status: 500 });
  }

  void touchAppUserProfile(userId);

  return NextResponse.json({ enabled: true, namespace, payload: result.payload });
});

export const PATCH = withLoggedRoute(async (request, context) => {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const params = await Promise.resolve(context.params);
  const namespace = params?.namespace;
  if (!isAppUserStorageNamespace(namespace)) {
    return NextResponse.json({ error: "Unknown namespace" }, { status: 404 });
  }

  if (!getSupabaseServiceRole()) {
    return NextResponse.json({ error: "Cloud storage is not configured" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateAppUserStoragePayload(namespace, body?.payload);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const saved = await upsertAppUserStoragePayload(userId, namespace, validated.payload);
  if (!saved.ok) {
    apiLog.error("app_storage_patch_failed", { namespace, err: saved.error });
    return NextResponse.json({ error: "Failed to save storage" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, namespace, payload: validated.payload });
});
