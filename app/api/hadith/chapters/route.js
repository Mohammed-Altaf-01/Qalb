import { NextResponse } from "next/server";

import { getHadithChaptersForBook } from "@/lib/hadith-catalog";

export async function GET(request) {
  const slug = request.nextUrl.searchParams.get("book");
  if (!slug) {
    return NextResponse.json({ error: "Missing book query param" }, { status: 400 });
  }

  try {
    const data = getHadithChaptersForBook(slug);
    if (!data) return NextResponse.json({ error: "Unknown book" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[/api/hadith/chapters]", e);
    return NextResponse.json({ error: "Failed to load chapters" }, { status: 500 });
  }
}
