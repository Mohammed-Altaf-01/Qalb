import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { authOptions } from "@/lib/auth";
import { apiLog } from "@/lib/logger";
import { UserRepository } from "@/lib/user-api";

async function getToken(request) {
  // Prefer session token (logged-in user)
  const session = await getServerSession(authOptions);
  if (session?.accessToken) return session.accessToken;
  // Fallback: legacy Bearer header (for backwards compat)
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const GET = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getBookmarks(token);
    return NextResponse.json(data ?? { bookmarks: [] });
  } catch (error) {
    apiLog.error("bookmark_get_failed", { err: error });
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
});

export const POST = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    const data = await UserRepository.addBookmark(token, verseKey);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    apiLog.error("bookmark_post_failed", { err: error });
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 });
  }
});

export const DELETE = withLoggedRoute(async (request) => {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    await UserRepository.removeBookmark(token, verseKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("bookmark_delete_failed", { err: error });
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
});
