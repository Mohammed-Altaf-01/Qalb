import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { UserRepository } from "@/lib/user-api";

async function getToken(request) {
  const session = await getServerSession(authOptions);
  if (session?.accessToken) return session.accessToken;
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const GET = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getNotes(token);
    return NextResponse.json(data ?? { notes: [] });
  } catch (error) {
    apiLog.error("notes_get_failed", { err: error });
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
});

export const POST = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey, text } = await request.json().catch(() => ({}));
  if (!verseKey || !text?.trim()) {
    return NextResponse.json({ error: "verseKey and text are required" }, { status: 400 });
  }

  try {
    const data = await UserRepository.createNote(token, verseKey, text.trim());
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    apiLog.error("notes_post_failed", { err: error });
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
});

export const PATCH = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { noteId, text } = await request.json().catch(() => ({}));
  if (!noteId || !text?.trim()) {
    return NextResponse.json({ error: "noteId and text are required" }, { status: 400 });
  }

  try {
    const data = await UserRepository.updateNote(token, noteId, text.trim());
    return NextResponse.json(data);
  } catch (error) {
    apiLog.error("notes_patch_failed", { err: error });
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
});

export const DELETE = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { noteId } = await request.json().catch(() => ({}));
  if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

  try {
    await UserRepository.deleteNote(token, noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("notes_delete_failed", { err: error });
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
});
