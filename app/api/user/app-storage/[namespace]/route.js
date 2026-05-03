import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { isAppUserStorageNamespace, validateAppUserStoragePayload } from "@/lib/app-user-storage";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { getAppUserStoragePayload, touchAppUserProfile, upsertAppUserStoragePayload } from "@/lib/supabase-app-user-repository";

export async function GET(_request, context) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
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
    console.error("[/api/user/app-storage GET]", result.error);
    return NextResponse.json({ error: "Failed to load storage" }, { status: 500 });
  }

  void touchAppUserProfile(userId);

  return NextResponse.json({ enabled: true, namespace, payload: result.payload });
}

export async function PATCH(request, context) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
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
    console.error("[/api/user/app-storage PATCH]", saved.error);
    return NextResponse.json({ error: "Failed to save storage" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, namespace, payload: validated.payload });
}
