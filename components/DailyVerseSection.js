/**
 * @fileoverview DailyVerseSection — Client Component
 *
 * Renders the "Verse of the Day" card and provides a small reload button
 * that fetches a random verse from the curated list via /api/verse/by-key.
 *
 * Receives the initial server-rendered verse as a prop so there's zero
 * loading flash on first paint — the refresh button only triggers on demand.
 */

"use client";

import { useState } from "react";

import { Loader2, RotateCcw } from "lucide-react";

import VerseCard from "@/components/VerseCard";

// ─────────────────────────────────────────────────────────────────────────────
// Curated verse pool (mirrors app/api/verse/daily/route.js)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hand-picked verse keys used when the user requests a fresh verse.
 * Keys confirmed to exist in the pre-production Quran Foundation API.
 * Removed: 29:69 (verse 404), 103:1 / 112:1 (chapter 404 in pre-prod).
 *
 * @type {string[]}
 */
const VERSE_POOL = [
  "2:255",
  "94:5",
  "2:286",
  "3:173",
  "65:3",
  "39:53",
  "13:28",
  "2:152",
  "18:10",
  "3:139",
  "55:13",
  "17:44",
  "2:45",
  "3:200",
  "49:13",
  "16:97",
  "25:63",
  "57:20",
  "1:1",
  "67:2",
  "51:56",
  "4:36",
  "7:204",
  "50:16",
  "24:35",
  "59:22",
  "33:41",
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verse-of-the-Day section with an inline refresh button.
 *
 * @param {{
 *   initialVerse: object|null,
 *   initialChapterName: string|undefined
 * }} props
 */
export default function DailyVerseSection({ initialVerse, initialChapterName }) {
  const [verse, setVerse] = useState(initialVerse);
  const [chapterName, setChapterName] = useState(initialChapterName ?? "");
  const [loading, setLoading] = useState(false);
  /** Tracks keys shown this session so we avoid immediate repeats. */
  const [shownKeys, setShownKeys] = useState(() => new Set([initialVerse?.verse_key]));

  /**
   * Picks a random verse key not yet shown in this session and fetches it.
   * If the API returns 404 (pre-production gaps), automatically retries
   * with a different key — up to the size of the pool.
   */
  async function handleRefresh() {
    if (loading) return;
    setLoading(true);

    // Build a shuffled candidate list, preferring unseen keys.
    const available = VERSE_POOL.filter((k) => !shownKeys.has(k));
    const candidates = [...(available.length > 0 ? available : VERSE_POOL)];

    let succeeded = false;
    while (candidates.length > 0 && !succeeded) {
      const idx = Math.floor(Math.random() * candidates.length);
      const key = candidates.splice(idx, 1)[0]; // remove so we don't retry it

      try {
        const res = await fetch(`/api/verse/by-key?key=${key}`);
        if (res.ok) {
          const data = await res.json();
          setVerse(data.verse);
          setChapterName(data.chapter?.name_simple ?? "");
          setShownKeys((prev) => new Set([...prev, key]));
          succeeded = true;
        } else if (res.status === 404) {
          // This key isn't available in pre-production — try the next one.
          continue;
        } else {
          // Non-retryable error (5xx, network, etc.) — stop.
          break;
        }
      } catch {
        break;
      }
    }

    setLoading(false);
  }

  return (
    <div>
      {/* Verse card */}
      {verse ? (
        <VerseCard verse={verse} chapterName={chapterName} />
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Could not load today&apos;s verse. Check your connection and try again.
          </p>
        </div>
      )}

      {/* Reload button — subtle, bottom-right of the section */}
      <div className="flex justify-end mt-2 pr-0.5">
        <button
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Load a different verse"
          title="Load a different verse"
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50
            hover:text-accent hover:opacity-80 transition-all duration-200
            active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <RotateCcw size={11} className="transition-transform duration-500 group-hover:rotate-180" />
          )}
          <span>{loading ? "Loading…" : "New verse"}</span>
        </button>
      </div>
    </div>
  );
}
