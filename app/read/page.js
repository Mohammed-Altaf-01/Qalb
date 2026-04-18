/**
 * @fileoverview /read — Quran Reading Mode
 *
 * Server Component: pre-fetches all 114 chapters so the surah picker
 * renders instantly with no client-side loading state.
 */
import { QuranRepository } from "@/lib/quran-api";

import ReadClient from "./ReadClient";

export const metadata = {
  title: "Read — Qalb",
  description: "Read the Quran with AI-powered page summaries and multi-language translations.",
};

export default async function ReadPage() {
  let chapters = [];
  try {
    const data = await QuranRepository.getChapters("en");
    chapters = data?.chapters ?? [];
  } catch (error) {
    console.error("[/read] Failed to load chapters:", error.message);
  }

  return <ReadClient chapters={chapters} />;
}
