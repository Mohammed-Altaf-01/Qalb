/**
 * @fileoverview GET /api/verse/by-key?key=2:255
 *
 * Fetches a single verse by its key along with its tafsir.
 * Used by the verse detail page and the discover feature.
 * API keys are kept server-side — clients never touch the Quran Foundation API directly.
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

/**
 * GET handler for fetching a verse and its tafsir by key.
 *
 * @param {Request} request
 * @returns {NextResponse} JSON with { verse, tafsir, chapter }
 */
export const GET = withLoggedRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const verseKey = searchParams.get("key");

  if (!verseKey || !/^\d+:\d+$/.test(verseKey)) {
    return NextResponse.json({ error: "Invalid verse key format. Expected format: '2:255'" }, { status: 400 });
  }

  const translationId = parseInt(searchParams.get("translation") ?? "20", 10) || 20;

  try {
    const chapterId = parseInt(verseKey.split(":")[0], 10);

    // Fetch verse, tafsir, and chapter info concurrently.
    // Tafsir and chapter are optional — pre-production API may 404 on some chapters.
    const [verseData, tafsirData, chapterData] = await Promise.all([
      QuranRepository.getVerseByKey(verseKey, { translationId }),
      QuranRepository.getTafsirByVerse(verseKey).catch(() => null),
      QuranRepository.getChapter(chapterId).catch(() => null),
    ]);

    return NextResponse.json({
      verse: verseData.verse,
      tafsir: tafsirData?.tafsir ?? null,
      chapter: chapterData?.chapter ?? null,
    });
  } catch (error) {
    // Propagate 404 so callers can retry with a different key instead of crashing.
    if (error.message?.includes("[404]")) {
      return NextResponse.json({ error: "Verse not found in API" }, { status: 404 });
    }
    apiLog.error("by_key_failed", { verseKey, err: error });
    return NextResponse.json({ error: "Failed to fetch verse" }, { status: 500 });
  }
});
