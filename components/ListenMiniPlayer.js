"use client";

import { useEffect, useState } from "react";

import { Pause, Play, X } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  getQuranAudioState,
  pauseQuranAudio,
  resumeQuranAudio,
  stopQuranAudio,
  subscribeQuranAudio,
} from "@/lib/quran-audio-player";

export default function ListenMiniPlayer() {
  const pathname = usePathname();
  const [player, setPlayer] = useState(getQuranAudioState());
  useEffect(() => subscribeQuranAudio(setPlayer), []);

  if (pathname === "/listen") return null;
  if (
    player.mode !== "listen" ||
    (player.status !== "playing" && player.status !== "paused" && player.status !== "loading")
  )
    return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,36rem)] rounded-xl border border-border/55 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (player.status === "playing" ? pauseQuranAudio() : resumeQuranAudio())}
          className="w-8 h-8 rounded-md bg-accent/15 text-accent flex items-center justify-center"
          aria-label={player.status === "playing" ? "Pause listen playback" : "Resume listen playback"}
        >
          {player.status === "playing" ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-foreground truncate">{player.label}</p>
          <p className="text-[10px] text-muted-foreground">Ayah {player.verseNum ?? 1}</p>
        </div>
        <button
          type="button"
          onClick={stopQuranAudio}
          className="w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 flex items-center justify-center"
          aria-label="Stop listen playback"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
