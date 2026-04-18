/**
 * @fileoverview Home Page — Quran Browser
 *
 * Server Component — pre-fetches all 114 chapters for instant first paint.
 * Layout: Bismillah header → Surah / Juz / Hizb tab browser (HomeClient).
 */
import BismillahHeader from "@/components/BismillahHeader";
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
    <div>
      {/* Bismillah greeting + date */}
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6">
        <BismillahHeader />
      </div>

      {/* Quran browser — Surah / Juz / Hizb tabs */}
      <HomeClient chapters={chapters} />
    </div>
  );
}
