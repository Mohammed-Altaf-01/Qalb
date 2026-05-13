"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Maximize2, RadioTower } from "lucide-react";

import { attachLiveHls } from "@/lib/hls-live";
import { buildLiveHlsQualityLevelOptions, defaultLiveHlsManualLevelIndex, clampLiveHlsUserLevel } from "@/lib/live-hls-level-labels";
import {
  attachLiveDualPrewarmToContainer,
  ensureLiveDualPrewarm,
  getActiveLiveDualVideo,
  pauseLiveDualPrewarm,
  resolveMakkahMadinahUrls,
  resumeLiveDualPrewarm,
  setLiveDualHlsLevelIndex,
  setLiveDualPrewarmActive,
  setLiveDualUserMuted,
  setLiveDualVideoObjectFit,
  slotForSelectedUrl,
  subscribeLiveDualHlsQuality,
} from "@/lib/live-dual-prewarm";
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
  const [videoFit, setVideoFit] = useState(readStoredVideoFit);
  const [dualQuality, setDualQuality] = useState({ native: false, levels: [] });
  const [legacyQuality, setLegacyQuality] = useState({ native: false, levels: [] });
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
    setLiveDualVideoObjectFit(videoFit);
    try {
      window.localStorage.setItem(LIVE_VIDEO_FIT_KEY, videoFit);
    } catch {
      /* ignore */
    }
  }, [videoFit]);

  useEffect(() => {
    if (!usingPrewarmPair) return undefined;
    const unsub = subscribeLiveDualHlsQuality((p) => {
      setDualQuality(p);
    });
    return unsub;
  }, [usingPrewarmPair]);

  useEffect(() => {
    setLevelIndex(DEFAULT_LIVE_HLS_LEVEL_INDEX);
  }, [channelsKey, usingPrewarmPair]);

  useEffect(() => {
    if (!usingPrewarmPair) return;
    setLiveDualHlsLevelIndex(levelIndex);
  }, [levelIndex, usingPrewarmPair, dualQuality.levels.length]);

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
      setLegacyQuality({ native: false, levels: [] });
      resumeLiveDualPrewarm();
      return;
    }

    pauseLiveDualPrewarm();

    const video = legacyVideoRef.current;
    if (!video || !selected?.url) return;

    setLegacyQuality({ native: false, levels: [] });
    setLevelIndex(DEFAULT_LIVE_HLS_LEVEL_INDEX);

    const hls = attachLiveHls(video, selected.url, {
      capLevelToPlayerSize: true,
      onManifestParsed: (instance) => {
        const rows = buildLiveHlsQualityLevelOptions(instance);
        setLegacyQuality({
          native: false,
          levels: [{ value: -1, label: "Auto" }, ...rows.map((r) => ({ value: r.value, label: r.label }))],
        });
        setLevelIndex(defaultLiveHlsManualLevelIndex(instance));
      },
    });
    legacyHlsRef.current = hls;

    if (!hls) {
      setLegacyQuality({ native: true, levels: [{ value: -1, label: "Auto (device)" }] });
      const onMeta = () =>
        setLegacyQuality({ native: true, levels: [{ value: -1, label: "Auto (device)" }] });
      video.addEventListener("loadedmetadata", onMeta, { once: true });
    }

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
  }, [levelIndex, usingPrewarmPair, selected?.url, legacyQuality.levels.length]);

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

  const qualityOptions = usingPrewarmPair ? dualQuality.levels : legacyQuality.levels;
  const qualityNative = usingPrewarmPair ? dualQuality.native : legacyQuality.native;
  const showQualitySelect = qualityOptions.length > 1;

  const selectLevelValue = useMemo(() => {
    if (!qualityOptions.some((o) => o.value === levelIndex)) return -1;
    return levelIndex;
  }, [qualityOptions, levelIndex]);

  const onLevelChange = useCallback((e) => {
    const v = Number.parseInt(e.target.value, 10);
    setLevelIndex(Number.isFinite(v) ? v : -1);
  }, []);

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
          <div className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/35 px-2 py-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Fit</span>
            <button
              type="button"
              onClick={() => setVideoFit("cover")}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                videoFit === "cover" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Fill
            </button>
            <button
              type="button"
              onClick={() => setVideoFit("contain")}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                videoFit === "contain" ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Full frame
            </button>
          </div>
          {showQualitySelect ? (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="shrink-0">Quality</span>
              <select
                value={selectLevelValue}
                onChange={onLevelChange}
                className="rounded-md border border-border/50 bg-background/60 px-2 py-1 text-xs text-foreground max-w-[10rem]"
                aria-label="Stream quality"
              >
                {qualityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : qualityNative && qualityOptions.length === 1 ? (
            <span className="text-[11px] text-muted-foreground px-1">{qualityOptions[0]?.label}</span>
          ) : null}
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

        <p className="text-[10px] leading-relaxed text-muted-foreground/90 max-w-2xl">
          This feed is provided by the broadcaster at up to about 480p; there is no separate 1080p or 4K track in the
          stream. &quot;Auto&quot; lets the player pick the best rung for your connection; you can lock a lower rung
          to save data.
          {qualityNative ? " On this browser, quality is controlled automatically (native HLS)." : null}
        </p>

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
