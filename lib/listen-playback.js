"use client";

import { flushListenHistoryFromPlayer } from "@/lib/useListenHistoryTracker";
import { startExternalQuranAudio } from "@/lib/quran-audio-player";

/**
 * @param {{ surahId: number, surahName: string, reciter: { id: number, name: string, server: string }, startAtSec?: number }} params
 */
export async function playListenSurah({ surahId, surahName, reciter, startAtSec = 0 }) {
  flushListenHistoryFromPlayer();
  const filename = String(surahId).padStart(3, "0");
  const server = reciter.server.endsWith("/") ? reciter.server : `${reciter.server}/`;
  await startExternalQuranAudio({
    mode: "listen",
    reciterId: reciter.id,
    reciterName: reciter.name,
    server,
    surahId,
    label: `${surahName} · ${reciter.name}`,
    url: `${server}${filename}.mp3`,
    startAtSec,
  });
}
