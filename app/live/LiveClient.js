"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Hls from "hls.js";
import { RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";

function pickDefaultChannel(channels) {
  if (!Array.isArray(channels) || channels.length === 0) return null;
  const byMakkah = channels.find((c) => /quran|makkah|mekka/i.test(c.name));
  return byMakkah || channels[0];
}

export default function LiveClient({ channels }) {
  const initial = useMemo(() => pickDefaultChannel(channels), [channels]);
  const [selectedId, setSelectedId] = useState(initial?.id ?? null);
  const videoRef = useRef(null);
  const selected = (channels ?? []).find((c) => c.id === selectedId) ?? initial;

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
    };
    video.addEventListener("canplay", play);
    play();
    return () => {
      video.removeEventListener("canplay", play);
      if (hls) hls.destroy();
    };
  }, [selected?.url]);

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <RadioTower className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Makkah & Madinah live</h1>
        <p className="text-sm text-muted-foreground">Default stream starts with Makkah (Quran channel).</p>
      </header>

      <div className="rounded-2xl border border-border/40 bg-card/35 p-3 md:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(channels ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "text-xs rounded-lg border px-3 py-1.5 transition-colors",
                c.id === selected?.id
                  ? "border-accent/35 bg-accent/15 text-accent"
                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/35",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden border border-border/35 bg-black">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            muted={false}
            className="w-full aspect-video bg-black"
            poster="/icon.svg"
          />
        </div>
      </div>
    </div>
  );
}
