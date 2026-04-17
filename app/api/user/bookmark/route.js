/**
 * @fileoverview /api/user/bookmark
 *
 * Handles bookmark CRUD operations:
 *  GET    — list all bookmarks
 *  POST   — add a bookmark  { verseKey: "2:255" }
 *  DELETE — remove a bookmark { verseKey: "2:255" }
 */
import { NextResponse } from "next/server";

import { UserRepository } from "@/lib/user-api";

/**
 * Extracts the Bearer token from the Authorization header.
 * @param {Request} request
 * @returns {string|null}
 */
function extractBearerToken(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/** GET — list all bookmarks for the user */
export async function GET(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const data = await UserRepository.getBookmarks(token);
    return NextResponse.json(data ?? { bookmarks: [] });
  } catch (error) {
    console.error("[/api/user/bookmark GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }
}

/** POST — add a bookmark */
export async function POST(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    const data = await UserRepository.addBookmark(token, verseKey);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[/api/user/bookmark POST] Error:", error);
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 });
  }
}

/** DELETE — remove a bookmark */
export async function DELETE(request) {
  const token = extractBearerToken(request);
  if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { verseKey } = await request.json().catch(() => ({}));
  if (!verseKey) return NextResponse.json({ error: "verseKey is required" }, { status: 400 });

  try {
    await UserRepository.removeBookmark(token, verseKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/user/bookmark DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }
}
