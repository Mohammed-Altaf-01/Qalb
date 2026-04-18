/**
 * @fileoverview GET /api/verse/by-chapter?surah=2&page=1&perPage=15&translation=131
 *
 * Paginates verses for a surah with the caller's chosen translation.
 * Used by the /read page reading mode.
 *
 * Response: { verses, pagination, chapter }
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const surah = parseInt(searchParams.get("surah") ?? "0", 10);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = Math.min(parseInt(searchParams.get("perPage") ?? "15", 10), 50);
  const translation = parseInt(searchParams.get("translation") ?? "131", 10);

  if (!surah || surah < 1 || surah > 114) {
    return NextResponse.json({ error: "Invalid surah number (1–114)" }, { status: 400 });
  }

  try {
    const [versesData, chapterData] = await Promise.all([
      QuranRepository.getVersesByChapter(surah, { translationId: translation, page, perPage }),
      QuranRepository.getChapter(surah).catch(() => null),
    ]);

    return NextResponse.json({
      verses: versesData.verses ?? [],
      pagination: versesData.pagination ?? {},
      chapter: chapterData?.chapter ?? null,
    });
  } catch (error) {
    console.error("[/api/verse/by-chapter]", error.message);
    return NextResponse.json({ error: "Failed to fetch verses" }, { status: 500 });
  }
}
