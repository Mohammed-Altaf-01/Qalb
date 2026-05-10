"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Hls from "hls.js";
import { RadioTower } from "lucide-react";

import {
  attachLiveDualPrewarmToContainer,
  ensureLiveDualPrewarm,
  getActiveLiveDualVideo,
  pauseLiveDualPrewarm,
  resolveMakkahMadinahUrls,
  resumeLiveDualPrewarm,
  setLiveDualPrewarmActive,
  setLiveDualUserMuted,
  slotForSelectedUrl,
} from "@/lib/live-dual-prewarm";
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
  const dualContainerRef = useRef(null);
  const detachDualRef = useRef(() => {});
  const legacyVideoRef = useRef(null);
  const legacyHlsRef = useRef(null);
  /** Latest UI state for applying audio after async attach completes */
  const liveSyncRef = useRef({ url: "", muted: false, usingPrewarm: true });

  const selected = (channels ?? []).find((c) => c.id === selectedId) ?? initial;
  const { makkahUrl, madinahUrl } = useMemo(() => resolveMakkahMadinahUrls(channels), [channels]);

  const usingPrewarmPair = Boolean(
    selected?.url && (selected.url === makkahUrl || selected.url === madinahUrl),
  );

  liveSyncRef.current = {
    url: selected?.url ?? "",
    muted: isMuted,
    usingPrewarm: usingPrewarmPair,
  };

  const channelsKey = useMemo(
    () => (channels ?? []).map((c) => `${c.id}:${c.url ?? ""}`).join("|"),
    [channels],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureLiveDualPrewarm(channels);
      if (cancelled || !dualContainerRef.current) return;
      detachDualRef.current?.();
      detachDualRef.current = attachLiveDualPrewarmToContainer(dualContainerRef.current);
      const s = liveSyncRef.current;
      if (s.usingPrewarm) {
        setLiveDualPrewarmActive(slotForSelectedUrl(s.url));
        setLiveDualUserMuted(s.muted);
      }
    })();
    return () => {
      cancelled = true;
      detachDualRef.current?.();
      detachDualRef.current = () => {};
    };
  }, [channelsKey, channels]);

  useEffect(() => {
    if (!usingPrewarmPair) return;
    setLiveDualPrewarmActive(slotForSelectedUrl(selected?.url));
    setLiveDualUserMuted(isMuted);
  }, [usingPrewarmPair, selected?.url, isMuted]);

  useEffect(() => {
    if (usingPrewarmPair) {
      if (legacyHlsRef.current) {
        try {
          legacyHlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        legacyHlsRef.current = null;
      }
      const v = legacyVideoRef.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {
          /* ignore */
        }
      }
      resumeLiveDualPrewarm();
      return;
    }

    pauseLiveDualPrewarm();

    const video = legacyVideoRef.current;
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
    legacyHlsRef.current = hls;
    const play = () => {
      video.play().catch(() => {});
      setIsPlaying(true);
    };
    video.addEventListener("canplay", play);
    video.muted = isMuted;
    play();
    return () => {
      video.removeEventListener("canplay", play);
      if (hls) {
        try {
          hls.destroy();
        } catch {
          /* ignore */
        }
      }
      legacyHlsRef.current = null;
      resumeLiveDualPrewarm();
    };
  }, [selected?.url, usingPrewarmPair, isMuted]);

  useEffect(() => {
    if (!usingPrewarmPair) return;
    const v = getActiveLiveDualVideo();
    if (!v) return;
    if (isPlaying) void v.play().catch(() => {});
    else v.pause();
  }, [isPlaying, usingPrewarmPair, selected?.url]);

  useEffect(() => {
    if (usingPrewarmPair) return;
    const video = legacyVideoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted, usingPrewarmPair]);

  function togglePlay() {
    if (usingPrewarmPair) {
      const video = getActiveLiveDualVideo();
      if (!video) return;
      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
        return;
      }
      video.pause();
      setIsPlaying(false);
      return;
    }
    const video = legacyVideoRef.current;
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
        <p className="text-sm text-muted-foreground">
          Streams preload in the background (muted). Opening Live unmutes Makkah by default; Madinah unmutes when you
          select it.
        </p>
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

        <div className="rounded-xl overflow-hidden border border-border/35 bg-black relative aspect-video w-full min-h-[200px] isolate">
          <div
            ref={dualContainerRef}
            className={cn(
              "absolute inset-0 z-0 min-h-0 min-w-0 h-full w-full overflow-hidden",
              !usingPrewarmPair && "hidden",
            )}
          />
          {!usingPrewarmPair ? (
            <video
              ref={legacyVideoRef}
              controls={false}
              autoPlay
              playsInline
              muted={isMuted}
              className="absolute inset-0 z-[1] h-full w-full object-contain bg-black"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
