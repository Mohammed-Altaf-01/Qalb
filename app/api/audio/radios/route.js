import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";

const MP3QURAN_BASE = "https://www.mp3quran.net/api/v3";

export const GET = withLoggedRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "eng";
  try {
    const res = await fetch(`${MP3QURAN_BASE}/radios?language=${encodeURIComponent(language)}`, {
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch radios" }, { status: res.status });
    }
    const data = await res.json();
    const radios = Array.isArray(data?.radios)
      ? data.radios
          .map((r) => ({
            id: Number(r?.id),
            name: String(r?.name ?? "").trim(),
            url: String(r?.url ?? "").trim(),
          }))
          .filter((r) => Number.isFinite(r.id) && r.name && r.url)
      : [];
    return NextResponse.json({ radios });
  } catch (error) {
    apiLog.error("radios_failed", { err: error });
    return NextResponse.json({ error: "Failed to fetch radios" }, { status: 500 });
  }
});
