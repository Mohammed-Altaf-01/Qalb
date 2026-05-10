/**
 * @fileoverview Verse Detail Page — Deep Dive + Reflection Journal
 *
 * The deepest engagement point in Qalb. For a given verse this page shows:
 *  1. Full Arabic text + translation + audio player
 *  2. Full tafsir (Ibn Kathir) — expandable
 *  3. AI-generated reflection questions (generated on demand)
 *  4. Personal reflection journal — write and save notes via Notes API
 *
 * URL: /verse/2:255  (verse key in the slug)
 *
 * Data fetching: The verse + tafsir are fetched server-side for
 * fast initial load and SEO. The reflection questions and notes
 * are client-side (user-specific, require interactivity).
 *
 * Note: Next.js dynamic segments use folder name [verseKey].
 * The bracket characters are escaped in the mkdir command.
 */
import { Suspense } from "react";

import {
  getInternalAppOrigin,
  shouldDeferLoopbackSelfFetchDuringBuild,
} from "@/lib/internal-app-url";

import VerseDetailClient from "./VerseDetailClient";

// ─────────────────────────────────────────────────────────────────────────────
// Server-side Data Fetching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches full verse data (verse + tafsir + chapter) from our API proxy.
 *
 * @param {string} verseKey - e.g. "2:255"
 * @returns {Promise<{verse: object, tafsir: object, chapter: object}|null>}
 */
async function fetchVerseData(verseKey) {
  try {
    const baseUrl = await getInternalAppOrigin();
    if (shouldDeferLoopbackSelfFetchDuringBuild(baseUrl)) {
      return null;
    }
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/verse/by-key?key=${encodeURIComponent(verseKey)}`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Metadata (dynamic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates dynamic <title> and <meta> tags for each verse page.
 * Improves SEO and social sharing previews.
 *
 * Next.js 15+ made `params` a Promise — must be awaited before accessing properties.
 * @param {{ params: Promise<{ verseKey: string }> }} context
 */
export async function generateMetadata({ params }) {
  const { verseKey: rawKey } = await params;
  const verseKey = decodeURIComponent(rawKey);
  const data = await fetchVerseData(verseKey);
  const chapterName = data?.chapter?.name_simple ?? "Quran";
  const translation = data?.verse?.translations?.[0]?.text?.replace(/<[^>]*>/g, "") ?? "";

  return {
    title: `${chapterName} ${verseKey} — Qalb`,
    description: translation.slice(0, 160),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verse detail page — Server Component shell that fetches data and passes
 * it to the interactive Client Component.
 *
 * Next.js 15+ made `params` a Promise — must be awaited before accessing properties.
 * @param {{ params: Promise<{ verseKey: string }> }} props
 */
export default async function VerseDetailPage({ params }) {
  const { verseKey: rawKey } = await params;
  const verseKey = decodeURIComponent(rawKey);
  const data = await fetchVerseData(verseKey);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 space-y-5 animate-fade-in-up">
          <div className="h-8 w-40 rounded-lg animate-shimmer mx-auto" />
          <div className="rounded-2xl border border-border/35 bg-card/25 p-5 space-y-3">
            <div className="h-4 rounded-md animate-shimmer w-24 mx-auto" />
            <div className="h-28 rounded-xl animate-shimmer w-full" />
            <div className="h-20 rounded-xl animate-shimmer w-full" />
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 flex-1 max-w-[5.5rem] rounded-lg animate-shimmer" />
            ))}
          </div>
        </div>
      }
    >
      <VerseDetailClient verseKey={verseKey} initialData={data} />
    </Suspense>
  );
}
