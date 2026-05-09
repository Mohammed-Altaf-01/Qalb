"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Headphones, Loader2, Pause, Sparkles } from "lucide-react";

import { READ_RECITERS } from "@/lib/read-reciters";
import { cn } from "@/lib/utils";

const IDLE_MS = 5 * 60 * 1000;

/**
 * After a period of no pointer/keyboard/scroll activity, offers a tiny “ambient Quran”
 * play control (random surah + reciter) — similar to auto-continue nudges on reading sites.
 */
export default function AmbientQuranTeaser() {
  const [phase, setPhase] = useState("hidden"); // hidden | ready | loading | playing | error
  const [label, setLabel] = useState("");
  const idleTimerRef = useRef(null);
  const audioRef = useRef(null);

  const bumpIdle = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      setPhase((p) => (p === "playing" || p === "loading" ? p : "ready"));
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    const opts = { capture: true, passive: true };
    const onAct = () => {
      setPhase((p) => {
        if (p === "playing" || p === "loading") return p;
        return "hidden";
      });
      bumpIdle();
    };
    for (const ev of ["pointerdown", "keydown", "scroll", "touchstart", "wheel"]) {
      window.addEventListener(ev, onAct, opts);
    }
    bumpIdle();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      for (const ev of ["pointerdown", "keydown", "scroll", "touchstart", "wheel"]) {
        window.removeEventListener(ev, onAct, opts);
      }
    };
  }, [bumpIdle]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
    }
    setPhase("hidden");
    bumpIdle();
  }, [bumpIdle]);

  const startRandom = useCallback(async () => {
    setPhase("loading");
    const surah = 1 + Math.floor(Math.random() * 114);
    const verse = 1;
    const reciters = READ_RECITERS;
    const rec = reciters[Math.floor(Math.random() * reciters.length)];
    const key = `${surah}:${verse}`;
    try {
      const res = await fetch(`/api/verse/audio?key=${encodeURIComponent(key)}&reciter=${rec.id}&segments=false`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (!data?.audioUrl) throw new Error("no url");
      setLabel(`Surah ${surah} · ${rec.name}`);
      setPhase("playing");
      const a = audioRef.current;
      if (!a) return;
      a.src = data.audioUrl;
      a.play().catch(() => setPhase("error"));
    } catch {
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => stop();
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [stop]);

  if (phase === "hidden") return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      <audio ref={audioRef} className="hidden" preload="none" />
      {phase === "ready" && (
        <button
          type="button"
          onClick={startRandom}
          className="flex items-center gap-1 rounded-lg border border-accent/35 bg-accent/10 px-2 py-1.5 text-[10px] font-medium text-accent hover:bg-accent/15 transition-colors"
          title="You have been still for a while — play a short recitation"
        >
          <Sparkles size={12} aria-hidden />
          <Headphones size={12} aria-hidden />
          <span className="hidden sm:inline max-w-[7rem] truncate">Listen</span>
        </button>
      )}
      {(phase === "loading" || phase === "playing" || phase === "error") && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]",
            phase === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border/45 bg-card/80",
          )}
        >
          {phase === "loading" ? (
            <Loader2 size={12} className="animate-spin text-accent shrink-0" aria-hidden />
          ) : phase === "playing" ? (
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              aria-label="Stop recitation"
            >
              <Pause size={12} className="text-accent shrink-0" aria-hidden />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : null}
          {phase === "error" ? (
            <>
              <span className="text-[10px]">Unavailable</span>
              <button type="button" onClick={stop} className="text-muted-foreground hover:text-foreground px-0.5">
                ✕
              </button>
            </>
          ) : (
            <span className="max-w-[9rem] truncate text-muted-foreground hidden sm:inline" title={label}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
