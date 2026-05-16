"use client";

import { startExternalQuranAudio } from "@/lib/quran-audio-player";

/**
 * @param {{ surahId: number, surahName: string, reciter: { id: number, name: string, server: string } }} params
 */
export async function playListenSurah({ surahId, surahName, reciter }) {
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
  });
}
