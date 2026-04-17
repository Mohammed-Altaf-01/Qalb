/**
 * @fileoverview GET /api/user/streak
 *
 * Returns the authenticated user's current reading streak.
 * Requires the user's OAuth2 Bearer token in the Authorization header.
 *
 * This route is a thin, authenticated proxy to the Quran Foundation User API.
 * It validates the auth header before forwarding to prevent unauthenticated calls.
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

/**
 * GET handler — returns the user's streak data.
 * @param {Request} request
 */
export async function GET(request) {
  const token = extractBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const streakData = await UserRepository.getStreak(token);
    return NextResponse.json(streakData ?? { streak: 0 });
  } catch (error) {
    console.error("[/api/user/streak] Error:", error);
    return NextResponse.json({ error: "Failed to fetch streak" }, { status: 500 });
  }
}
