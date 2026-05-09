"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Hls from "hls.js";
import { RadioTower } from "lucide-react";

import { disposeLiveWarmup } from "@/lib/live-stream-warmup";
import { cn } from "@/lib/utils";

function pickDefaultChannel(channels) {
  if (!Array.isArray(channels) || channels.length === 0) return null;
  const byMakkah = channels.find((c) => /quran|makkah|mekka/i.test(c.name));
  return byMakkah || channels[0];
}

function displayChannelName(name) {
  if (/makkah|mekka|quran/i.test(name ?? "")) return "Makkah Live";
  if (/madina|madinah|sunnah|sunna/i.test(name ?? "")) return "Madina Live";
  return name;
}

export default function LiveClient({ channels }) {
  const initial = useMemo(() => pickDefaultChannel(channels), [channels]);
  const [selectedId, setSelectedId] = useState(initial?.id ?? null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);
  const selected = (channels ?? []).find((c) => c.id === selectedId) ?? initial;

  useEffect(() => {
    disposeLiveWarmup();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected?.url) return;
    let hls;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selected.url;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(selected.url);
      hls.attachMedia(video);
    } else {
      video.src = selected.url;
    }

    const play = () => {
      video.play().catch(() => {});
      setIsPlaying(true);
    };
    video.addEventListener("canplay", play);
    play();
    return () => {
      video.removeEventListener("canplay", play);
      if (hls) hls.destroy();
    };
  }, [selected?.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }
    video.pause();
    setIsPlaying(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <RadioTower className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Makkah & Madina live</h1>
        <p className="text-sm text-muted-foreground">Default stream starts with Makkah Live.</p>
      </header>

      <div className="rounded-2xl border border-border/40 bg-card/35 p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(channels ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "text-xs rounded-full border px-3 py-1.5 transition-colors",
                c.id === selected?.id
                  ? "border-accent/35 bg-accent/20 text-accent"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/35",
              )}
            >
              {displayChannelName(c.name)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40"
          >
            {isPlaying ? "Pause stream" : "Play stream"}
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((v) => !v)}
            className="rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-foreground hover:bg-muted/40"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>

        <div className="rounded-xl overflow-hidden border border-border/35 bg-black">
          <video
            ref={videoRef}
            controls={false}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full aspect-video bg-black"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      </div>
    </div>
  );
}
