"use client";

import { useEffect, useMemo, useState } from "react";

import { Headphones, Play, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getQuranAudioState, startExternalQuranAudio, subscribeQuranAudio } from "@/lib/quran-audio-player";
import { useGamification } from "@/lib/useGamification";
import { cn } from "@/lib/utils";

/**
 * @param {{ chapters: Array<{ id: number; name_simple: string; verses_count: number }>, reciters: Array<any> }} props
 */
export default function ListenClient({ chapters, reciters }) {
  const { award } = useGamification();
  const parsedReciters = useMemo(() => {
    const raw = Array.isArray(reciters) ? reciters : [];
    return raw
      .map((r) => {
        /** Already normalized via [/api/audio/reciters](/api/audio/reciters) */
        if (r?.server != null && Array.isArray(r.surahIds)) {
          let server = String(r.server ?? "").trim();
          if (!server) return null;
          server = server.endsWith("/") ? server : `${server}/`;
          const surahIds = r.surahIds.filter((n) => Number.isFinite(n) && n >= 1 && n <= 114).sort((a, b) => a - b);
          return {
            id: Number(r?.id),
            name: String(r?.name ?? "").trim(),
            server,
            surahIds,
          };
        }
        const moshaf = Array.isArray(r?.moshaf) ? r.moshaf : [];
        const preferred = moshaf.find((m) => Number(m?.moshaf_type) === 0) || moshaf[0];
        let server = String(preferred?.server ?? "").trim();
        const surahIds = Array.from(
          new Set(
            String(preferred?.surah_list ?? "")
              .split(",")
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => Number.isFinite(n) && n >= 1 && n <= 114),
          ),
        ).sort((a, b) => a - b);
        server = server.endsWith("/") ? server : `${server}/`;
        return {
          id: Number(r?.id),
          name: String(r?.name ?? "").trim(),
          server,
          surahIds,
        };
      })
      .filter((r) => r && Number.isFinite(r.id) && r.name && r.server && r.surahIds.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reciters]);

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
    const filename = String(chapter.id).padStart(3, "0");
    await startExternalQuranAudio({
      mode: "listen",
      reciterName: selectedReciter.name,
      surahId: chapter.id,
      label: `${chapter.name_simple} · ${selectedReciter.name}`,
      url: `${selectedReciter.server}${filename}.mp3`,
    });
    award("play_audio", { surahNumber: chapter.id, reciterId: selectedReciter.id });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8 pb-24 md:pb-12 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <Headphones className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Listen</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Quranic audio</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
          Pick a surah and reciter, then play the ayah you choose. Same Quran Foundation audio as Read — inspired by{" "}
          <a
            href="https://quranicaudio.com/"
            className="text-accent hover:underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            QuranicAudio
          </a>{" "}
          and{" "}
          <a
            href="https://quran.com/"
            className="text-accent hover:underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Quran.com
          </a>
          .
        </p>
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
            {player.mode === "listen" && player.surahId ? (
              <p className="text-[11px] text-muted-foreground">
                Playing: Surah {player.surahId}
              </p>
            ) : null}
          </div>
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
