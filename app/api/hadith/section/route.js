import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { fetchHadithSection } from "@/lib/hadith-catalog";
import { apiLog } from "@/lib/logger";

export const GET = withLoggedRoute(async (request) => {
  const edition = request.nextUrl.searchParams.get("edition");
  const section = request.nextUrl.searchParams.get("section");
  if (!edition || section == null || section === "") {
    return NextResponse.json({ error: "Missing edition or section" }, { status: 400 });
  }

  try {
    const data = await fetchHadithSection(edition, section);
    if (!data) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    apiLog.error("hadith_section_failed", { err: e });
    return NextResponse.json({ error: "Failed to load section" }, { status: 500 });
  }
});
