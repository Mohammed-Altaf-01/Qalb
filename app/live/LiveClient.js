"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Maximize2, RadioTower } from "lucide-react";

import { afterQuranPlaybackEnd, onLiveRouteEnter, setLiveRouteActive } from "@/lib/audio-focus";
import { attachLiveHls } from "@/lib/hls-live";
import {
  attachLiveDualPrewarmToContainer,
  ensureLiveDualPrewarm,
  getActiveLiveDualVideo,
  getLiveDualUserMuted,
  pauseLiveDualPrewarm,
  resolveMakkahMadinahUrls,
  resumeLiveDualPrewarm,
  setLiveDualHlsLevelIndex,
  setLiveDualPrewarmActive,
  setLiveDualUserMuted,
  setLiveDualVideoObjectFit,
  slotForSelectedUrl,
} from "@/lib/live-dual-prewarm";
import { clampLiveHlsUserLevel, defaultLiveHlsManualLevelIndex } from "@/lib/live-hls-level-labels";
import { subscribeQuranAudio } from "@/lib/quran-audio-player";
import { cn } from "@/lib/utils";

const LIVE_VIDEO_FIT_KEY = "qalb_live_video_fit";

function readStoredVideoFit() {
  if (typeof window === "undefined") return "cover";
  const v = window.localStorage.getItem(LIVE_VIDEO_FIT_KEY);
  return v === "contain" ? "contain" : "cover";
}

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

/** Default manual level: ~384p (Globecast Roku ladder index 1). */
const DEFAULT_LIVE_HLS_LEVEL_INDEX = 1;

export default function LiveClient({ channels }) {
  const initial = useMemo(() => pickDefaultChannel(channels), [channels]);
  const [selectedId, setSelectedId] = useState(initial?.id ?? null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoFit] = useState(readStoredVideoFit);
  const [levelIndex, setLevelIndex] = useState(DEFAULT_LIVE_HLS_LEVEL_INDEX);
  const dualContainerRef = useRef(null);
  const detachDualRef = useRef(() => {});
  const legacyVideoRef = useRef(null);
  const legacyHlsRef = useRef(null);
  /** Latest UI state for applying audio after async attach completes */
  const liveSyncRef = useRef({ url: "", muted: false, usingPrewarm: true });

  const selected = (channels ?? []).find((c) => c.id === selectedId) ?? initial;
  const { makkahUrl, madinahUrl } = useMemo(() => resolveMakkahMadinahUrls(channels), [channels]);

  const usingPrewarmPair = Boolean(selected?.url && (selected.url === makkahUrl || selected.url === madinahUrl));

  liveSyncRef.current = {
    url: selected?.url ?? "",
    muted: isMuted,
    usingPrewarm: usingPrewarmPair,
  };

  const channelsKey = useMemo(() => (channels ?? []).map((c) => `${c.id}:${c.url ?? ""}`).join("|"), [channels]);

  useEffect(() => {
    setLiveRouteActive(true);
    void onLiveRouteEnter();
    return () => {
      setLiveRouteActive(false);
      void afterQuranPlaybackEnd();
    };
  }, []);

  useEffect(() => {
    setLiveDualVideoObjectFit(videoFit);
    try {
      window.localStorage.setItem(LIVE_VIDEO_FIT_KEY, videoFit);
    } catch {
      /* ignore */
    }
  }, [videoFit]);

  useEffect(() => {
    setLevelIndex(DEFAULT_LIVE_HLS_LEVEL_INDEX);
  }, [channelsKey, usingPrewarmPair]);

  useEffect(() => {
    if (!usingPrewarmPair) return;
    setLiveDualHlsLevelIndex(levelIndex);
  }, [levelIndex, usingPrewarmPair]);

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

  /** Keep Mute button in sync when listen/radio ducks live via audio-focus */
  useEffect(() => {
    if (!usingPrewarmPair) return undefined;
    return subscribeQuranAudio((player) => {
      const quranActive =
        (player.mode === "listen" || player.mode === "radio") &&
        (player.status === "playing" || player.status === "paused" || player.status === "loading");
      if (quranActive) {
        setIsMuted(getLiveDualUserMuted());
      } else if (player.status === "idle") {
        setIsMuted(getLiveDualUserMuted());
      }
    });
  }, [usingPrewarmPair]);

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

    setLevelIndex(DEFAULT_LIVE_HLS_LEVEL_INDEX);

    const hls = attachLiveHls(video, selected.url, {
      capLevelToPlayerSize: true,
      onManifestParsed: (instance) => {
        setLevelIndex(defaultLiveHlsManualLevelIndex(instance));
      },
    });
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
    if (!usingPrewarmPair || !isPlaying) return;
    const t = window.setTimeout(() => {
      const v = getActiveLiveDualVideo();
      if (v && v.paused) void v.play().catch(() => {});
    }, 500);
    return () => window.clearTimeout(t);
  }, [usingPrewarmPair, isPlaying, channelsKey]);

  useEffect(() => {
    if (usingPrewarmPair) return;
    const video = legacyVideoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted, usingPrewarmPair]);

  useEffect(() => {
    if (usingPrewarmPair) return;
    const h = legacyHlsRef.current;
    if (!h?.levels?.length) return;
    try {
      h.currentLevel = clampLiveHlsUserLevel(levelIndex, h.levels.length);
    } catch {
      /* ignore */
    }
  }, [levelIndex, usingPrewarmPair, selected?.url]);

  function togglePlay() {
    if (usingPrewarmPair) {
      const video = getActiveLiveDualVideo();
      if (!video) return;
      if (video.paused) {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
        return;
      }
      video.pause();
      setIsPlaying(false);
      return;
    }
    const video = legacyVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
      return;
    }
    video.pause();
    setIsPlaying(false);
  }

  function requestLiveFullscreen() {
    const el = usingPrewarmPair ? getActiveLiveDualVideo() : legacyVideoRef.current;
    void el?.requestFullscreen?.();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-accent">
          <RadioTower className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Live</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Makkah & Madina live</h1>
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

        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={requestLiveFullscreen}
            className="inline-flex items-center justify-center rounded-lg border border-border/50 bg-background/50 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40"
            aria-label="Fullscreen"
            title="Fullscreen"
          >
            <Maximize2 size={14} aria-hidden />
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
              className={cn(
                "absolute inset-0 z-[1] h-full w-full bg-black",
                videoFit === "cover" ? "object-cover" : "object-contain",
              )}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
