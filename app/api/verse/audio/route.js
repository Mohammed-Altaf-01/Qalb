/**
 * @fileoverview GET /api/verse/audio?key=2:255
 *
 * Fetches the verified audio URL for a verse from the Quran Foundation
 * Recitations API, then returns the fully-qualified CDN URL.
 *
 * Why a dedicated route instead of hardcoding the CDN pattern:
 *  - The Quran Foundation API returns the canonical, guaranteed-correct path
 *  - Hardcoded patterns break when the CDN restructures paths
 *  - This route keeps API credentials server-side (never exposed to the client)
 *
 * Response: { audioUrl: string, verseKey: string, reciter: string }
 */
import { NextResponse } from "next/server";

import { QuranRepository } from "@/lib/quran-api";

/** CDN base that the Quran Foundation audio paths are relative to */
const AUDIO_CDN_BASE = "https://verses.quran.com";

// Verified IDs from /content/api/v4/resources/recitations
// 1=AbdulBaset Mujawwad, 2=AbdulBaset Murattal, 3=Al-Sudais, 6=Al-Husary, 7=Mishari Alafasy, 10=Al-Shuraym
const SUPPORTED_RECITER_IDS = new Set([1, 2, 3, 6, 7, 10]);

/** Fallback recitation IDs to try if the requested one has no audio file */
const RECITATION_FALLBACK_IDS = [7, 2, 1];

/**
 * GET handler — returns a playable audio URL for the given verse key.
 *
 * @param {Request} request
 * @returns {NextResponse} JSON: { audioUrl, verseKey, reciter }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const verseKey = searchParams.get("key");
  const reciterParam = parseInt(searchParams.get("reciter") ?? "0", 10);
  const withSegments = searchParams.get("segments") === "true";

  if (!verseKey || !/^\d+:\d+$/.test(verseKey)) {
    return NextResponse.json({ error: "Invalid verse key. Expected format: '2:255'" }, { status: 400 });
  }

  const idsToTry = SUPPORTED_RECITER_IDS.has(reciterParam)
    ? [reciterParam, ...RECITATION_FALLBACK_IDS.filter((id) => id !== reciterParam)]
    : RECITATION_FALLBACK_IDS;

  for (const recitationId of idsToTry) {
    try {
      const data = await QuranRepository.getVerseAudio(verseKey, recitationId, withSegments);
      const audioFile = data?.audio_files?.[0] ?? data?.audio_file ?? null;

      if (!audioFile) continue;

      const relativePath = audioFile.url ?? audioFile.audio_url ?? "";
      if (!relativePath) continue;

      const audioUrl = relativePath.startsWith("http") ? relativePath : `${AUDIO_CDN_BASE}/${relativePath}`;

      const response = { audioUrl, verseKey, recitationId };
      // segments: [[word_idx, start_ms, end_ms], ...] — only present when requested
      if (withSegments) response.segments = audioFile.segments ?? null;

      return NextResponse.json(response);
    } catch (err) {
      console.warn(`[/api/verse/audio] Recitation ${recitationId} failed:`, err.message);
    }
  }

  return NextResponse.json({ error: "Audio not available for this verse" }, { status: 404 });
}
