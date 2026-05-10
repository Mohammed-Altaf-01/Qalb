import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

export const GET = withLoggedRoute(async (request) => {
  const language = new URL(request.url).searchParams.get("language") ?? "en";
  try {
    const data = await QuranRepository.getTranslationList(language);
    return NextResponse.json(data ?? { translations: [] });
  } catch (e) {
    apiLog.error("quran_translations_list_failed", { err: e });
    return NextResponse.json({ error: "Failed to load translations" }, { status: 502 });
  }
});

export const revalidate = 86_400;
