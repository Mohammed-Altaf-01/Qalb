import { getInternalAppOrigin, shouldDeferLoopbackSelfFetchDuringBuild } from "@/lib/internal-app-url";
import { QuranRepository } from "@/lib/quran-api";

import ListenClient from "./ListenClient";

export const metadata = {
  title: "Listen — Qalb",
  description: "Stream recitations by surah and ayah — Quranic audio in your browser.",
};

export default async function ListenPage() {
  let chapters = [];
  /** Normalized `{ id, name, server, surahIds }[]` from [/api/audio/reciters](/api/audio/reciters) */
  let reciters = [];
  try {
    const data = await QuranRepository.getChapters("en");
    chapters = data?.chapters ?? [];
  } catch (e) {
    console.error("[/listen] chapters:", e?.message ?? e);
  }
  try {
    const base = await getInternalAppOrigin();
    if (shouldDeferLoopbackSelfFetchDuringBuild(base)) {
      throw new Error("defer_reciters_build");
    }
    const res = await fetch(`${base.replace(/\/$/, "")}/api/audio/reciters?language=eng`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const data = await res.json();
      reciters = Array.isArray(data?.reciters) ? data.reciters : [];
    }
  } catch {}

  return <ListenClient chapters={chapters} reciters={reciters} />;
}
