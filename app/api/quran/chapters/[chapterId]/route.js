/**
 * GET /api/quran/chapters/[chapterId] — single chapter metadata.
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

export const GET = withLoggedRoute(async (request, context) => {
  const params = await Promise.resolve(context.params);
  const raw = params?.chapterId;
  const chapterId = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") ?? "en";

  if (!chapterId || chapterId < 1 || chapterId > 114) {
    return NextResponse.json({ error: "Invalid chapter id (1–114)" }, { status: 400 });
  }

  try {
    const data = await QuranRepository.getChapter(chapterId, language);
    return NextResponse.json(data);
  } catch (error) {
    if (error.message?.includes("[404]")) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    apiLog.error("quran_chapter_failed", { chapterId, err: error });
    return NextResponse.json({ error: "Failed to load chapter" }, { status: 500 });
  }
});
