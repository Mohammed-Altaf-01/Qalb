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

import { aiService } from "@/lib/claude";

/**
 * POST handler — returns AI-generated reflection questions.
 *
 * @param {Request} request
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { verseKey, arabicText, translation, tafsirSnippet } = body;

  if (!verseKey || !translation) {
    return NextResponse.json({ error: "verseKey and translation are required" }, { status: 400 });
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
    console.error("[/api/ai/reflect] Error:", error);

    // Return generic fallback questions — never fail silently on the UI
    return NextResponse.json({
      questions: [
        "How does this verse relate to something you are experiencing right now?",
        "What action can you take today that reflects the teaching of this verse?",
        "How would your daily life look different if you truly internalized this verse?",
      ],
    });
  }
}
