import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

export async function GET(request) {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getBookmarks(token);
    return NextResponse.json(data ?? { bookmarks: [] });
  } catch (error) {
    console.error("[/api/user/bookmark GET]", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

export async function POST(request) {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    const data = await UserRepository.addBookmark(token, verseKey);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[/api/user/bookmark POST]", error);
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const token = await getToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    await UserRepository.removeBookmark(token, verseKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/user/bookmark DELETE]", error);
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
}
