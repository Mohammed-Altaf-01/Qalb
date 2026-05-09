import { QuranRepository } from "@/lib/quran-api";

import ListenClient from "./ListenClient";

export const metadata = {
  title: "Listen — Qalb",
  description: "Stream recitations by surah and ayah — Quranic audio in your browser.",
};

export default async function ListenPage() {
  let chapters = [];
  let reciters = [];
  try {
    const data = await QuranRepository.getChapters("en");
    chapters = data?.chapters ?? [];
  } catch (e) {
    console.error("[/listen] chapters:", e?.message ?? e);
  }
  try {
    const res = await fetch("https://www.mp3quran.net/api/v3/reciters?language=eng", { next: { revalidate: 60 * 60 * 24 } });
    if (res.ok) {
      const data = await res.json();
      reciters = Array.isArray(data?.reciters) ? data.reciters : [];
    }
  } catch {}

  return <ListenClient chapters={chapters} reciters={reciters} />;
}
