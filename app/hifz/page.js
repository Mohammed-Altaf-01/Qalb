import { QuranRepository } from "@/lib/quran-api";

import HifzClient from "./HifzClient";

export const metadata = {
  title: "Hifz practice — Qalb",
  description: "Spaced repetition for verses you are memorizing.",
};

export default async function HifzPage() {
  let chapters = [];
  try {
    const data = await QuranRepository.getChapters("en");
    chapters = data?.chapters ?? [];
  } catch (error) {
    console.error("[/hifz] Failed to load chapters:", error.message);
  }

  return (
    <div className="mx-auto max-w-xl px-4 md:px-8 py-8 space-y-2">
      <h1 className="text-xl font-bold text-foreground">Hifz desk</h1>
      <p className="text-xs text-muted-foreground mb-4">
        Add verses by surah, page, or ayah range — revision queue uses spaced repetition on this device.
      </p>
      <HifzClient chapters={chapters} />
    </div>
  );
}
