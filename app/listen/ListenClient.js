"use client";

import { useEffect, useMemo, useState } from "react";

import { Headphones, Play, Search } from "lucide-react";
import Link from "next/link";

import ListenPlaybackProgress from "@/components/ListenPlaybackProgress";
import { Button } from "@/components/ui/button";
import { playListenSurah } from "@/lib/listen-playback";
import { parseMp3QuranReciters } from "@/lib/listen-reciters";
import { getQuranAudioState, subscribeQuranAudio } from "@/lib/quran-audio-player";
import { useGamification } from "@/lib/useGamification";
import { cn } from "@/lib/utils";

/**
 * @param {{ chapters: Array<{ id: number; name_simple: string; verses_count: number }>, reciters: Array<any> }} props
 */
export default function ListenClient({ chapters, reciters: initialReciters }) {
  const { award } = useGamification();
  const [reciters, setReciters] = useState(() => initialReciters);
  useEffect(() => {
    setReciters(initialReciters);
  }, [initialReciters]);

  const needsClientReciters = !Array.isArray(reciters) || reciters.length === 0;
  useEffect(() => {
    if (!needsClientReciters) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/audio/reciters?language=eng");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const rows = Array.isArray(data?.reciters) ? data.reciters : [];
        if (!cancelled && rows.length > 0) setReciters(rows);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsClientReciters]);

  const parsedReciters = useMemo(() => parseMp3QuranReciters(reciters), [reciters]);

  const [selectedReciterId, setSelectedReciterId] = useState(parsedReciters?.[0]?.id ?? null);
  const [reciterQuery, setReciterQuery] = useState("");
  const [player, setPlayer] = useState(getQuranAudioState());
  useEffect(() => subscribeQuranAudio(setPlayer), []);
  useEffect(() => {
    if (!selectedReciterId && parsedReciters[0]?.id) setSelectedReciterId(parsedReciters[0].id);
  }, [parsedReciters, selectedReciterId]);

  const selectedReciter = parsedReciters.find((r) => r.id === selectedReciterId) ?? parsedReciters[0] ?? null;
  const filteredReciters = useMemo(() => {
    const q = reciterQuery.trim().toLowerCase();
    if (!q) return parsedReciters;
    return parsedReciters.filter((r) => r.name.toLowerCase().includes(q));
  }, [parsedReciters, reciterQuery]);
  const playableSurahs = useMemo(() => {
    if (!selectedReciter) return [];
    const allowed = new Set(selectedReciter.surahIds);
    return (chapters ?? []).filter((c) => allowed.has(c.id));
  }, [selectedReciter, chapters]);

  async function playSurah(chapter) {
    if (!selectedReciter) return;
    await playListenSurah({
      surahId: chapter.id,
      surahName: chapter.name_simple,
      reciter: selectedReciter,
    });
    award("play_audio", { surahNumber: chapter.id, reciterId: selectedReciter.id });
  }

  const playingName =
    player.mode === "listen" && player.surahId
      ? (chapters?.find((c) => c.id === player.surahId)?.name_simple ?? player.label?.split(" · ")[0])
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 pb-24 md:pb-12 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <Headphones className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Listen</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Quranic audio</h1>
      </header>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-3 md:p-4 grid gap-3 md:grid-cols-[17rem_1fr] min-h-[28rem]">
        <section className="rounded-xl border border-border/30 bg-background/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reciters (A–Z)</p>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="search"
              value={reciterQuery}
              onChange={(e) => setReciterQuery(e.target.value)}
              placeholder="Find reciter..."
              className="w-full rounded-lg border border-border/45 bg-card/35 pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/45"
            />
          </div>
          <div className="space-y-1 max-h-[22rem] overflow-y-auto pr-1">
            {filteredReciters.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReciterId(r.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedReciter?.id === r.id
                    ? "bg-accent/15 text-accent border border-accent/25"
                    : "text-foreground/85 hover:bg-muted/40",
                )}
              >
                {r.name}
              </button>
            ))}
            {filteredReciters.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 px-2 py-2">No reciters match this search.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-border/30 bg-background/25 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm text-foreground">
              Surahs for <span className="text-accent font-medium">{selectedReciter?.name}</span>
            </p>
            {playingName ? (
              <p className="text-[11px] text-muted-foreground">Playing: {playingName}</p>
            ) : null}
          </div>
          {playingName ? <ListenPlaybackProgress className="max-w-md mb-3" /> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[22rem] overflow-y-auto pr-1">
            {playableSurahs.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => playSurah(chapter)}
                className={cn(
                  "rounded-lg border border-border/35 bg-card/45 px-3 py-2 text-left transition-colors",
                  player.mode === "listen" && player.surahId === chapter.id
                    ? "border-accent/35 bg-accent/10"
                    : "hover:border-accent/25 hover:bg-accent/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {chapter.id}. {chapter.name_simple}
                  </span>
                  <Play size={12} className="text-accent shrink-0" />
                </div>
                <span className="text-[10px] text-muted-foreground">{chapter.verses_count} verses</span>
              </button>
            ))}
          </div>
          {playableSurahs.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-2">No playable surahs found for this reciter.</p>
          ) : null}
        </section>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/read">
          <Button variant="outline">Open Read</Button>
        </Link>
        <p className="text-xs text-muted-foreground">Playback keeps running when you move to other pages.</p>
      </div>
    </div>
  );
}
