/**
 * @fileoverview /read — Quran Reading Mode
 *
 * Server Component: pre-fetches all 114 chapters so the surah picker
 * renders instantly with no client-side loading state.
 *
 * Accepts ?surah=<id> to auto-open a specific surah (linked from home page).
 */
import { QuranRepository } from "@/lib/quran-api";

import ReadClient from "./ReadClient";

export const metadata = {
  title: "Read — Qalb",
  description: "Read the Quran with AI-powered page summaries and multi-language translations.",
};

export default async function ReadPage({ searchParams }) {
  let chapters = [];
  try {
    const data = await QuranRepository.getChapters("en");
    chapters = data?.chapters ?? [];
  } catch (error) {
    console.error("[/read] Failed to load chapters:", error.message);
  }

  const params = await searchParams;
  const initialSurahId = params?.surah ? parseInt(params.surah, 10) : null;
  const initialStartVerse = params?.startVerse ? parseInt(params.startVerse, 10) : 1;
  const initialLayout = params?.layout === "mushaf" ? "mushaf" : null;
  const initialMushafPage = params?.page ? parseInt(params.page, 10) : null;

  return (
    <ReadClient
      chapters={chapters}
      initialSurahId={initialSurahId}
      initialStartVerse={initialStartVerse}
      initialLayout={initialLayout}
      initialMushafPage={initialMushafPage}
    />
  );
}
