/**
 * @fileoverview GET /api/search?q=...&size=10
 *
 * Proxies search requests to the Quran Foundation Search API.
 * Exposes only the parameters the client needs — keeps API keys server-side.
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

/**
 * GET handler for Quran full-text search.
 *
 * @param {Request} request
 * @returns {NextResponse} JSON with { results, total_results }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const size = parseInt(searchParams.get("size") ?? "10", 10);

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const data = await QuranRepository.searchVerses(query, { size });
    return NextResponse.json(data.search ?? { results: [], total_results: 0 });
  } catch (error) {
    console.error("[/api/search] Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
