/**
 * @fileoverview Home Page — Quran Browser
 *
 * Server Component — pre-fetches all 114 chapters for instant first paint.
 * Layout: Bismillah header → rotating ayah/hadith → Read Ahadith → Surah / Juz / Hizb (HomeClient).
 */
import BismillahHeader from "@/components/BismillahHeader";
import ReadAhadithSection from "@/components/ReadAhadithSection";
import RotatingVerse from "@/components/RotatingVerse";
import { QuranRepository } from "@/lib/quran-api";

import HomeClient from "./HomeClient";

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching (Server-side)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchChapters() {
  try {
    const data = await QuranRepository.getChapters("en");
    return data?.chapters ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const chapters = await fetchChapters();

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-5xl px-4 md:px-8 pt-5">
        <BismillahHeader />
        {/* Rotating ayah / hadith — desktop only, cycles every 5s */}
        <RotatingVerse />
      </div>

      <ReadAhadithSection />

      {/* Quran browser — Surah / Juz / Hizb tabs */}
      <HomeClient chapters={chapters} />
    </div>
  );
}
