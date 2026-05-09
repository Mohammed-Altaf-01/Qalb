"use client";

import { useEffect, useState } from "react";

import { Pause, Play } from "lucide-react";

import {
  getQuranAudioState,
  pauseQuranAudio,
  resumeQuranAudio,
  startExternalQuranAudio,
  subscribeQuranAudio,
} from "@/lib/quran-audio-player";
import { cn } from "@/lib/utils";

export default function RadioQuranButton() {
  const [player, setPlayer] = useState(getQuranAudioState());

  useEffect(() => subscribeQuranAudio(setPlayer), []);

  async function handleClick() {
    if (player.mode === "radio") {
      if (player.status === "playing") {
        pauseQuranAudio();
        return;
      }
      if (player.status === "paused") {
        await resumeQuranAudio();
        return;
      }
    }
    const res = await fetch("/api/audio/radios?language=eng");
    if (!res.ok) return;
    const data = await res.json();
    const stations = Array.isArray(data?.radios) ? data.radios : [];
    if (stations.length === 0) return;
    const station = stations[Math.floor(Math.random() * stations.length)];
    await startExternalQuranAudio({
      mode: "radio",
      label: station.name,
      url: station.url,
    });
  }

  const active = player.mode === "radio" && (player.status === "playing" || player.status === "paused" || player.status === "loading");

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active && player.status === "playing" ? "Pause Quran radio" : "Play Quran radio"}
      title={active ? player.label || "Quran radio" : "Play random Quran radio stream"}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
        active ? "text-accent bg-accent/12 border border-accent/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
      )}
    >
      {active && player.status === "playing" ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
    </button>
  );
}
