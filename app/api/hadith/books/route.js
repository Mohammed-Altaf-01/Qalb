import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { listHadithBooks } from "@/lib/hadith-catalog";
import { apiLog } from "@/lib/logger";

export const GET = withLoggedRoute(async () => {
  try {
    const books = listHadithBooks();
    return NextResponse.json({ books });
  } catch (e) {
    apiLog.error("hadith_books_failed", { err: e });
    return NextResponse.json({ error: "Failed to list books" }, { status: 500 });
  }
});
