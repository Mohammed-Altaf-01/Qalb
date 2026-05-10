/**
 * @fileoverview POST /api/ai/discover
 *
 * The core AI endpoint — powers the "What's on your mind?" feature.
 *
 * Flow:
 *  1. Receive user's free-text life situation description
 *  2. Extract keywords and run a Quran Foundation search to pre-fetch candidates
 *  3. Pass the situation + search results to Claude (with Quran MCP) for ranking
 *  4. Return 3 ranked verse keys with relevance explanations
 *  5. Client fetches full verse data for each key via /api/verse/by-key
 *
 * Rate limiting note: In production, add a rate limiter here (e.g. Upstash)
 * to prevent Claude API abuse. For the hackathon demo this is omitted for brevity.
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { aiService } from "@/lib/claude";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

export const maxDuration = 60;

/** Maximum allowed input length to prevent prompt injection and abuse */
const MAX_INPUT_LENGTH = 500;

/**
 * Extracts meaningful keywords from a natural language situation description
 * for use in the initial Quran search.
 *
 * @param {string} situation - User's free-text input
 * @returns {string} Space-joined keyword string for the search API
 */
function extractSearchKeywords(situation) {
  // Remove common stop words and keep meaningful terms
  const stopWords = new Set([
    "i",
    "am",
    "is",
    "are",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "my",
    "me",
    "we",
    "it",
    "this",
    "that",
    "have",
    "has",
    "been",
    "was",
    "were",
    "will",
    "would",
    "could",
    "should",
    "feeling",
    "feel",
    "going",
    "through",
    "really",
    "very",
  ]);

  return situation
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 6) // Cap at 6 keywords to keep search focused
    .join(" ");
}

/**
 * POST handler — discovers contextually relevant Quran verses.
 *
 * @param {Request} request - Body: { situation: string }
 * @returns {NextResponse} JSON with { verses: Array<{verse_key, relevance_explanation, theme}> }
 */
export const POST = withLoggedRoute(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { situation } = body;

  // ── Input Validation ──────────────────────────────────────────────────────

  if (!situation || typeof situation !== "string") {
    return NextResponse.json({ error: "situation field is required" }, { status: 400 });
  }

  const trimmed = situation.trim();
  if (trimmed.length < 10) {
    return NextResponse.json({ error: "Please share a bit more about what you are going through." }, { status: 400 });
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: `Input must be under ${MAX_INPUT_LENGTH} characters.` }, { status: 400 });
  }

  // ── Step 1: Pre-fetch candidate verses via keyword search ────────────────

  let searchResults = [];
  try {
    const keywords = extractSearchKeywords(trimmed);
    if (keywords) {
      const searchData = await QuranRepository.searchVerses(keywords, { size: 15 });
      searchResults = searchData?.search?.results ?? [];
      if (searchResults.length < 5) {
        const broadSearch = await QuranRepository.searchVerses(trimmed.slice(0, 90), { size: 20 });
        const broad = broadSearch?.search?.results ?? [];
        const seen = new Set(searchResults.map((r) => r?.verse?.verse_key).filter(Boolean));
        for (const row of broad) {
          const key = row?.verse?.verse_key;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          searchResults.push(row);
        }
      }
    }
  } catch (err) {
    apiLog.warn("discover_search_prefetch_failed", { errMessage: err?.message ?? String(err) });
  }

  // ── Step 2: AI contextual ranking via Claude + Quran MCP ─────────────────

  try {
    const result = await aiService.discoverVerses(trimmed, searchResults);

    if (!result.success || result.verses.length === 0) {
      return NextResponse.json(
        { error: "No relevant verses found. Please try describing your situation differently." },
        { status: 422 },
      );
    }

    return NextResponse.json({ verses: result.verses });
  } catch (error) {
    apiLog.error("discover_claude_failed", { err: error });
    return NextResponse.json({ error: "AI service temporarily unavailable. Please try again." }, { status: 503 });
  }
});
