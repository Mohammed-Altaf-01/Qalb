/**
 * Home — minimal Quran browser: Hadith strip, recent reads, full surah list.
 */
import { QuranRepository } from "@/lib/quran-api";

import HomeClient from "./HomeClient";

async function fetchChapters() {
  try {
    const data = await QuranRepository.getChapters("en");
    return data?.chapters ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const chapters = await fetchChapters();

  return (
    <div className="pb-4">
      <HomeClient chapters={chapters} />
    </div>
  );
}
