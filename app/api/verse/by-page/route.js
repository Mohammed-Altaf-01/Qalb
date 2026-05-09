/**
 * GET /api/verse/by-page?page=1&translation=20
 *
 * Returns one Quran Mushaf page (1-604), including verses across surah boundaries.
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const translation = parseInt(searchParams.get("translation") ?? "20", 10) || 20;

  if (!Number.isFinite(page) || page < 1 || page > 604) {
    return NextResponse.json({ error: "Invalid mushaf page (1-604)" }, { status: 400 });
  }

  try {
    const data = await QuranRepository.getVersesByPage(page, { translationId: translation });
    return NextResponse.json({
      page,
      verses: data?.verses ?? [],
      pagination: data?.pagination ?? {},
    });
  } catch (error) {
    console.error("[/api/verse/by-page]", error?.message ?? error);
    return NextResponse.json({ error: "Failed to fetch mushaf page" }, { status: 500 });
  }
}
