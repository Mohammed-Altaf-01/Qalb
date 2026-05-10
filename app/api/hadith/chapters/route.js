import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { getHadithChaptersForBook } from "@/lib/hadith-catalog";

export const GET = withLoggedRoute(async (request) => {
  const slug = request.nextUrl.searchParams.get("book");
  if (!slug) {
    return NextResponse.json({ error: "Missing book query param" }, { status: 400 });
  }

  try {
    const data = getHadithChaptersForBook(slug);
    if (!data) return NextResponse.json({ error: "Unknown book" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    apiLog.error("hadith_chapters_failed", { err: e });
    return NextResponse.json({ error: "Failed to load chapters" }, { status: 500 });
  }
});
