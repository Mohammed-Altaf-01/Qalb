import { NextResponse } from "next/server";

import { listHadithBooks } from "@/lib/hadith-catalog";

export async function GET() {
  try {
    const books = listHadithBooks();
    return NextResponse.json({ books });
  } catch (e) {
    console.error("[/api/hadith/books]", e);
    return NextResponse.json({ error: "Failed to list books" }, { status: 500 });
  }
}
