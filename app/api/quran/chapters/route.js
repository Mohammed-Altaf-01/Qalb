/**
 * GET /api/quran/chapters — list surahs (proxies Quran Foundation; keeps credentials server-side).
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

export const GET = withLoggedRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") ?? "en";

  try {
    const data = await QuranRepository.getChapters(language);
    return NextResponse.json(data);
  } catch (error) {
    apiLog.error("quran_chapters_list_failed", { err: error });
    return NextResponse.json({ error: "Failed to load chapters" }, { status: 500 });
  }
});
