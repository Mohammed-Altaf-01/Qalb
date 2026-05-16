"use client";

import { useEffect, useState } from "react";

import { formatAudioTime } from "@/lib/format-audio-time";
import { getQuranAudioState, seekQuranAudio, subscribeQuranAudio } from "@/lib/quran-audio-player";
import { cn } from "@/lib/utils";

/**
 * YouTube-style timeline for full-surah Listen playback only.
 * @param {{ className?: string }} props
 */
export default function ListenPlaybackProgress({ className }) {
  const [player, setPlayer] = useState(getQuranAudioState());
  useEffect(() => subscribeQuranAudio(setPlayer), []);

  const active =
    player.mode === "listen" &&
    player.streamUrl &&
    (player.status === "playing" || player.status === "paused" || player.status === "loading");

  if (!active) return null;

  const duration = player.duration > 0 ? player.duration : 0;
  const current = Math.min(player.currentTime || 0, duration || player.currentTime || 0);
  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div className="relative h-1.5 rounded-full bg-muted/50 group">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-accent pointer-events-none"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-accent shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seekQuranAudio(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Seek playback"
        />
      </div>
      <p className="text-[10px] text-muted-foreground tabular-nums">
        {formatAudioTime(current)} / {formatAudioTime(duration)}
      </p>
    </div>
  );
}
