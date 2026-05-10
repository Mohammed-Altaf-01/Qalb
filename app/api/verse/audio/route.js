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

import { withLoggedRoute } from "@/lib/api-route-utils";
import { apiLog } from "@/lib/logger";
import { QuranRepository } from "@/lib/quran-api";
import { normalizeVerseAudioUrl } from "@/lib/verse-audio-url";

/** CDN base that the Quran Foundation audio paths are relative to */
const AUDIO_CDN_BASE = "https://verses.quran.com";

// Verified IDs from /content/api/v4/resources/recitations
// 1=AbdulBaset Mujawwad, 2=AbdulBaset Murattal, 3=Al-Sudais, 6=Al-Husary, 7=Mishari Alafasy, 10=Al-Shuraym
const SUPPORTED_RECITER_IDS = new Set([1, 2, 3, 6, 7, 10]);

/** Prefer these reciters (in order) when the user's pick has no URL or segments fail upstream. */
const RECITATION_FALLBACK_IDS = [7, 2, 1, 3, 6, 10];

/**
 * @param {unknown} data
 */
function extractAudioPayload(data, wantSegments, verseKey, recitationId) {
  const audioFile = data?.audio_files?.[0] ?? data?.audio_file ?? null;
  if (!audioFile) return null;
  const relativePath = audioFile.url ?? audioFile.audio_url ?? "";
  const audioUrl = normalizeVerseAudioUrl(relativePath, AUDIO_CDN_BASE);
  if (!audioUrl) return null;
  const payload = {
    audioUrl,
    verseKey,
    recitationId,
    segments:
      wantSegments && Array.isArray(audioFile.segments) && audioFile.segments.length ? audioFile.segments : null,
  };
  return payload;
}

/**
 * GET handler — returns a playable audio URL for the given verse key.
 *
 * @param {Request} request
 * @returns {NextResponse} JSON: { audioUrl, verseKey, reciter }
 */
export const GET = withLoggedRoute(async (request) => {
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

  /** When segments are requested but the segmented call fails empty, retry plain audio for the same reciter. */
  const segmentPasses = withSegments ? [true, false] : [false];

  for (const recitationId of idsToTry) {
    for (const wantSegments of segmentPasses) {
      try {
        const data = await QuranRepository.getVerseAudio(verseKey, recitationId, wantSegments);
        const payload = extractAudioPayload(data, wantSegments, verseKey, recitationId);
        if (payload) return NextResponse.json(payload);
      } catch (err) {
        apiLog.warn("verse_audio_attempt", {
          recitationId,
          wantSegments,
          errMessage: err?.message ?? String(err),
        });
      }
    }
  }

  return NextResponse.json({ error: "Audio not available for this verse" }, { status: 404 });
});
