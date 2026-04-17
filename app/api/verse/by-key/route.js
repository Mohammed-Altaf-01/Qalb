/**
 * @fileoverview GET /api/verse/by-key?key=2:255
 *
 * Fetches a single verse by its key along with its tafsir.
 * Used by the verse detail page and the discover feature.
 * API keys are kept server-side — clients never touch the Quran Foundation API directly.
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

/**
 * GET handler for fetching a verse and its tafsir by key.
 *
 * @param {Request} request
 * @returns {NextResponse} JSON with { verse, tafsir, chapter }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const verseKey = searchParams.get("key");

  if (!verseKey || !/^\d+:\d+$/.test(verseKey)) {
    return NextResponse.json({ error: "Invalid verse key format. Expected format: '2:255'" }, { status: 400 });
  }

  try {
    const chapterId = parseInt(verseKey.split(":")[0], 10);

    // Fetch verse, tafsir, and chapter info concurrently
    const [verseData, tafsirData, chapterData] = await Promise.all([
      QuranRepository.getVerseByKey(verseKey, { translationId: 131 }),
      QuranRepository.getTafsirByVerse(verseKey).catch(() => null), // tafsir is optional
      QuranRepository.getChapter(chapterId),
    ]);

    return NextResponse.json({
      verse: verseData.verse,
      tafsir: tafsirData?.tafsir ?? null,
      chapter: chapterData.chapter,
    });
  } catch (error) {
    console.error(`[/api/verse/by-key] Error for key=${verseKey}:`, error);
    return NextResponse.json({ error: "Failed to fetch verse" }, { status: 500 });
  }
}
