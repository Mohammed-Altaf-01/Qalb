import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { normalizeLiveTvStreamUrl } from "@/lib/live-tv-stream-url";
import { apiLog } from "@/lib/logger";

const MP3QURAN_BASE = "https://www.mp3quran.net/api/v3";

export const GET = withLoggedRoute(async (request) => {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "eng";
  try {
    const res = await fetch(`${MP3QURAN_BASE}/live-tv?language=${encodeURIComponent(language)}`, {
      next: { revalidate: 60 * 30 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch live channels" }, { status: res.status });
    }
    const data = await res.json();
    const channels = Array.isArray(data?.livetv)
      ? data.livetv
          .map((c) => {
            const url = normalizeLiveTvStreamUrl(String(c?.url ?? "").trim());
            return {
              id: Number(c?.id),
              name: String(c?.name ?? "").trim(),
              url,
            };
          })
          .filter((c) => Number.isFinite(c.id) && c.name && c.url)
      : [];
    return NextResponse.json({ channels });
  } catch (error) {
    apiLog.error("live_tv_failed", { err: error });
    return NextResponse.json({ error: "Failed to fetch live channels" }, { status: 500 });
  }
});
