"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronDown, Pause, Play, X } from "lucide-react";

import ListenPlaybackProgress from "@/components/ListenPlaybackProgress";
import { playListenSurah } from "@/lib/listen-playback";
import { findListenReciter, getPlayableListenSurahs, parseMp3QuranReciters } from "@/lib/listen-reciters";
import {
  getQuranAudioState,
  pauseQuranAudio,
  resumeQuranAudio,
  stopQuranAudio,
  subscribeQuranAudio,
} from "@/lib/quran-audio-player";
import { useListenHistoryTracker } from "@/lib/useListenHistoryTracker";
import { cn } from "@/lib/utils";

export default function ListenMiniPlayer() {
  useListenHistoryTracker();
  const [player, setPlayer] = useState(getQuranAudioState());
  const [chapters, setChapters] = useState([]);
  const [parsedReciters, setParsedReciters] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => subscribeQuranAudio(setPlayer), []);

  const listenActive =
    player.mode === "listen" &&
    (player.status === "playing" || player.status === "paused" || player.status === "loading");

  useEffect(() => {
    if (!listenActive) return;
    let cancelled = false;
    setCatalogLoading(true);
    (async () => {
      try {
        const [chRes, recRes] = await Promise.all([
          fetch("/api/quran/chapters?language=en"),
          fetch("/api/audio/reciters?language=eng"),
        ]);
        if (cancelled) return;
        if (chRes.ok) {
          const chData = await chRes.json();
          setChapters(Array.isArray(chData?.chapters) ? chData.chapters : []);
        }
        if (recRes.ok) {
          const recData = await recRes.json();
          setParsedReciters(parseMp3QuranReciters(recData?.reciters));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listenActive]);

  const listenReciter = useMemo(
    () => findListenReciter(parsedReciters, player),
    [parsedReciters, player.reciterId, player.reciterName, player.server, player.streamUrl],
  );

  const playableSurahs = useMemo(
    () => (listenReciter ? getPlayableListenSurahs(chapters, listenReciter) : []),
    [chapters, listenReciter],
  );

  if (!listenActive) return null;

  async function handleSurahChange(surahId) {
    const id = Number(surahId);
    if (!listenReciter || !Number.isFinite(id) || id === player.surahId) return;
    const chapter = chapters.find((c) => c.id === id);
    if (!chapter) return;
    await playListenSurah({
      surahId: id,
      surahName: chapter.name_simple,
      reciter: listenReciter,
    });
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,36rem)] rounded-xl border border-border/55 bg-card/95 backdrop-blur-sm px-3 py-2.5 shadow-lg space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (player.status === "playing" ? pauseQuranAudio() : resumeQuranAudio())}
          className="w-8 h-8 rounded-md bg-accent/15 text-accent flex items-center justify-center shrink-0"
          aria-label={player.status === "playing" ? "Pause listen playback" : "Resume listen playback"}
        >
          {player.status === "playing" ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          {playableSurahs.length > 0 ? (
            <div className="relative">
              <select
                value={player.surahId ?? ""}
                onChange={(e) => void handleSurahChange(e.target.value)}
                disabled={catalogLoading || player.status === "loading"}
                aria-label="Select surah"
                className={cn(
                  "w-full appearance-none rounded-md border border-border/50 bg-background/60",
                  "pl-2 pr-7 py-1 text-[11px] text-foreground truncate",
                  "focus:outline-none focus:border-accent/45",
                  (catalogLoading || player.status === "loading") && "opacity-60",
                )}
              >
                {playableSurahs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}. {c.name_simple}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          ) : (
            <p className="text-[11px] text-foreground truncate">{player.label}</p>
          )}
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {listenReciter?.name ?? player.reciterName ?? "Reciter"}
          </p>
        </div>
        <button
          type="button"
          onClick={stopQuranAudio}
          className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 flex items-center justify-center shrink-0"
          aria-label="Stop listen playback"
        >
          <X size={13} />
        </button>
      </div>
      <ListenPlaybackProgress />
    </div>
  );
}
