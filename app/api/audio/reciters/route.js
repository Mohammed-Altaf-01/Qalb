import { NextResponse } from "next/server";

const MP3QURAN_BASE = "https://www.mp3quran.net/api/v3";

function parseSurahIds(csv) {
  if (typeof csv !== "string") return [];
  return Array.from(
    new Set(
      csv
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 114),
    ),
  ).sort((a, b) => a - b);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "eng";
  try {
    const res = await fetch(`${MP3QURAN_BASE}/reciters?language=${encodeURIComponent(language)}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch reciters" }, { status: res.status });
    }
    const data = await res.json();
    const reciters = Array.isArray(data?.reciters)
      ? data.reciters
          .map((r) => {
            const moshafList = Array.isArray(r?.moshaf) ? r.moshaf : [];
            const preferred = moshafList.find((m) => Number(m?.moshaf_type) === 0) || moshafList[0];
            const server = String(preferred?.server ?? "").trim();
            const surahIds = parseSurahIds(String(preferred?.surah_list ?? ""));
            return {
              id: Number(r?.id),
              name: String(r?.name ?? "").trim(),
              server,
              surahIds,
            };
          })
          .filter((r) => Number.isFinite(r.id) && r.name && r.server && r.surahIds.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

    return NextResponse.json({ reciters });
  } catch (error) {
    console.error("[/api/audio/reciters]", error?.message ?? error);
    return NextResponse.json({ error: "Failed to fetch reciters" }, { status: 500 });
  }
}
