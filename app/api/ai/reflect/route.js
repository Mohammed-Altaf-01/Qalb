/**
 * @fileoverview POST /api/ai/reflect
 *
 * Generates 3 personal reflection questions for a given verse.
 * Used on the verse detail page to help users go deeper than
 * just reading — turning passive reading into active reflection.
 *
 * @param {Request} request - Body: { verseKey, arabicText, translation, tafsirSnippet? }
 * @returns {NextResponse} JSON with { questions: string[] }
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { aiService } from "@/lib/claude";
import { apiLog } from "@/lib/logger";

export const maxDuration = 30;

/**
 * POST handler — returns AI-generated reflection questions.
 *
 * @param {Request} request
 */
export const POST = withLoggedRoute(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { verseKey, arabicText, translation, tafsirSnippet } = body;

  if (!verseKey) {
    return NextResponse.json({ error: "verseKey is required" }, { status: 400 });
  }

  try {
    const questions = await aiService.generateReflectionPrompts(
      verseKey,
      arabicText ?? "",
      translation,
      tafsirSnippet ?? "",
    );

    return NextResponse.json({ questions });
  } catch (error) {
    apiLog.error("reflect_failed", { err: error });

    // Return generic fallback questions — never fail silently on the UI
    return NextResponse.json({
      questions: [
        "How does this verse relate to something you are experiencing right now?",
        "What action can you take today that reflects the teaching of this verse?",
        "How would your daily life look different if you truly internalized this verse?",
      ],
    });
  }
});
