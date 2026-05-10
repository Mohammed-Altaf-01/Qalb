import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

export const GET = withLoggedRoute(async () => {
  try {
    const data = await QuranRepository.getJuzList();
    return NextResponse.json(data ?? { juzs: [] });
  } catch (e) {
    apiLog.error("quran_juz_list_failed", { err: e });
    return NextResponse.json({ error: "Failed to load juz metadata" }, { status: 502 });
  }
});

export const revalidate = 86_400;
