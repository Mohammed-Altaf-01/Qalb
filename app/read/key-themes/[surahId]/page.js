import { notFound } from "next/navigation";

import ReadKeyThemesViewClient from "./ReadKeyThemesViewClient";

export const metadata = {
  title: "Key themes — Qalb",
  description: "View saved AI key themes for a surah, then continue reading in the Quran reader.",
};

/**
 * @param {{ params: Promise<{ surahId: string }> }} props
 */
export default async function ReadKeyThemesPage({ params }) {
  const p = await params;
  const n = parseInt(String(p.surahId), 10);
  if (!Number.isFinite(n) || n < 1 || n > 114) notFound();

  return <ReadKeyThemesViewClient surahId={n} />;
}
