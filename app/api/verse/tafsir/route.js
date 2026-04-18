/**
 * @fileoverview GET /api/verse/tafsir?key=2:255&tafsirId=169
 *
 * Fetches tafsir for a specific verse + tafsir ID.
 * Separated from by-key so the verse detail page can swap tafsirs
 * without re-fetching the Arabic text and translation.
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const verseKey = searchParams.get("key");
  const tafsirId = parseInt(searchParams.get("tafsirId") ?? "169", 10) || 169;

  if (!verseKey || !/^\d+:\d+$/.test(verseKey)) {
    return NextResponse.json({ error: "Invalid verse key" }, { status: 400 });
  }

  try {
    const data = await QuranRepository.getTafsirByVerse(verseKey, tafsirId);
    return NextResponse.json({ tafsir: data?.tafsir ?? null });
  } catch (error) {
    console.error(`[/api/verse/tafsir] key=${verseKey} tafsirId=${tafsirId}`, error);
    return NextResponse.json({ tafsir: null }, { status: 200 }); // soft fail
  }
}
