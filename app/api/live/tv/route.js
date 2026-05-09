import { NextResponse } from "next/server";

const MP3QURAN_BASE = "https://www.mp3quran.net/api/v3";

export async function GET(request) {
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
          .map((c) => ({
            id: Number(c?.id),
            name: String(c?.name ?? "").trim(),
            url: String(c?.url ?? "").trim(),
          }))
          .filter((c) => Number.isFinite(c.id) && c.name && c.url)
      : [];
    return NextResponse.json({ channels });
  } catch (error) {
    console.error("[/api/live/tv]", error?.message ?? error);
    return NextResponse.json({ error: "Failed to fetch live channels" }, { status: 500 });
  }
}
