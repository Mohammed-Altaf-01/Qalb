"use client";

import { useEffect, useState } from "react";

import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    const unsub = subscribeQuranAudio((next) => {
      if (next.mode === "radio" && next.status === "error" && next.error) {
        toast.error("Quran radio couldn’t start", { description: next.error });
      }
      setPlayer(next);
    });
    return unsub;
  }, []);

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
    if (!res.ok) {
      toast.error("Couldn’t load radio list", { description: `HTTP ${res.status}` });
      return;
    }
    const data = await res.json();
    const stations = Array.isArray(data?.radios) ? data.radios : [];
    if (stations.length === 0) {
      toast.error("No radio stations returned", { description: "Try again in a moment." });
      return;
    }
    const station = stations[Math.floor(Math.random() * stations.length)];
    await startExternalQuranAudio({
      mode: "radio",
      label: station.name,
      url: station.url,
    });
  }

  const active =
    player.mode === "radio" &&
    (player.status === "playing" || player.status === "paused" || player.status === "loading");

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active && player.status === "playing" ? "Pause Quran radio" : "Play Quran radio"}
      title={active ? player.label || "Quran radio" : "Play random Quran radio stream"}
      className={cn(
        "group relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
        active ? "text-accent hover:bg-muted/35" : "text-muted-foreground hover:text-foreground hover:bg-muted/35",
      )}
    >
      {active && player.status === "playing" ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="radio-playing-ring-arc h-[calc(100%-5px)] w-[calc(100%-5px)] max-h-[2.25rem] max-w-[2.25rem] rounded-full" />
        </span>
      ) : null}
      {active && player.status === "playing" ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 rounded-md border border-border/50 bg-card/95 px-2 py-1 text-[10px] text-foreground/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 whitespace-nowrap">
        Quran Radio
      </span>
    </button>
  );
}
