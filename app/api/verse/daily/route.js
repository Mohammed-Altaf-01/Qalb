/**
 * @fileoverview GET /api/verse/daily
 *
 * Returns the "verse of the day" — deterministic by date so every user
 * on the same day sees the same verse, but it changes each day.
 *
 * Strategy: Use today's date as a seed to pick a verse key from a
 * curated list of impactful verses. Falls back to a random verse if
 * the curated fetch fails.
 *
 * This route is cached by Next.js for the duration of the day (86400s).
 */
import { NextResponse } from "next/server";

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";

/**
 * A hand-picked list of impactful, well-known Quran verses.
 * Cycling through these ensures the daily verse is always meaningful.
 * This list can be expanded — one verse per notable theme.
 *
 * @type {string[]}
 */
const CURATED_VERSE_KEYS = [
  "2:255", // Ayat al-Kursi — the Throne Verse
  "94:5", // "With hardship comes ease"
  "2:286", // "Allah does not burden a soul beyond that it can bear"
  "3:173", // "Allah is sufficient for us"
  "65:3", // "Whoever relies upon Allah — He is sufficient for him"
  "39:53", // "Do not despair of the mercy of Allah"
  "13:28", // "Verily, in the remembrance of Allah do hearts find rest"
  "2:152", // "Remember Me, and I will remember you"
  "18:10", // The companions of the cave — trust in Allah
  "3:139", // "Do not lose heart, nor fall into despair"
  "55:13", // "Which of your Lord's favors will you deny?"
  "17:44", // All creation glorifies Allah
  "2:45", // "Seek help through patience and prayer"
  "3:200", // "Be patient, persevere, be steadfast"
  "49:13", // "The most noble among you is the most righteous"
  "16:97", // "Whoever does righteous deeds — a good life"
  "25:63", // Attributes of the servants of the Most Merciful
  "57:20", // The nature of the worldly life
  "1:1", // Al-Fatiha — the opening
  "67:2", // "He who created death and life to test you"
  "51:56", // "I created jinn and mankind only to worship Me"
  "4:36", // "Worship Allah and associate nothing with Him"
  "7:204", // "When the Quran is recited, listen and pay attention"
  "50:16", // "We are closer to him than his jugular vein"
  "24:35", // The Light Verse
  "59:22", // The attributes of Allah
  "33:41", // "O you who believe, remember Allah often"
  // Removed: 29:69 (verse 404 in pre-prod), 103:1 / 112:1 (chapter 404 in pre-prod)
];

/**
 * Picks today's verse key deterministically from the curated list.
 * The same date always produces the same verse — creates a shared
 * daily experience across all users.
 *
 * @returns {string} A verse key like "2:255"
 */
function getDailyVerseKey() {
  const today = new Date();
  // Use a stable integer that changes daily: YYYYMMDD
  const dateInt = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const index = dateInt % CURATED_VERSE_KEYS.length;
  return CURATED_VERSE_KEYS[index];
}

/**
 * GET handler — returns today's verse with translation and audio.
 *
 * @param {Request} _request - Unused but required by Next.js route signature
 * @returns {NextResponse} JSON with { verse, chapter, date }
 */
export const GET = withLoggedRoute(async (_request) => {
  try {
    const verseKey = getDailyVerseKey();

    // Fetch verse data and chapter info in parallel for performance
    const [verseData, chapterId] = await Promise.all([
      QuranRepository.getVerseByKey(verseKey, { translationId: 131 }),
      Promise.resolve(parseInt(verseKey.split(":")[0], 10)),
    ]);

    const chapterData = await QuranRepository.getChapter(chapterId).catch(() => null);

    return NextResponse.json({
      verse: verseData.verse,
      chapter: chapterData?.chapter ?? null,
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
    });
  } catch (error) {
    apiLog.error("daily_verse_failed", { err: error });

    // Fallback: return a random verse rather than an error page
    try {
      const fallback = await QuranRepository.getRandomVerse();
      return NextResponse.json({ verse: fallback.verse, date: new Date().toISOString().split("T")[0] });
    } catch {
      return NextResponse.json({ error: "Failed to fetch daily verse" }, { status: 500 });
    }
  }
});

/** Cache this response for 24 hours — the daily verse never changes within a day */
export const revalidate = 86400;
