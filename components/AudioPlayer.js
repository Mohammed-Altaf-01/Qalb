/**
 * @fileoverview AudioPlayer Component
 *
 * Plays Quranic verse recitation audio. Fetches the verified audio URL
 * from our /api/verse/audio proxy (which calls the Quran Foundation
 * Recitations API) rather than hardcoding CDN path patterns.
 *
 * States:
 *  loading   — fetching the audio URL from our API
 *  ready     — audio URL resolved, player is interactive
 *  playing   — recitation is actively playing
 *  error     — URL fetch failed or audio element errored
 *
 * Design Patterns:
 *  - State Machine : explicit loading → ready → playing → ended lifecycle
 *  - Null Object   : graceful "unavailable" UI instead of throwing
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Loader2, Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

/** Playback speed options — cycles on button click */
const SPEEDS = [0.75, 1, 1.25, 1.5];

/**
 * Supported reciters — IDs match Quran Foundation Recitations API.
 * Verified to work in pre-production.
 */
// Verified against Quran Foundation Recitations API — /content/api/v4/resources/recitations
const RECITERS = [
  { id: 7, name: "Mishari Alafasy" },
  { id: 3, name: "Abdul Rahman Al-Sudais" },
  { id: 2, name: "AbdulBaset (Murattal)" },
  { id: 1, name: "AbdulBaset (Mujawwad)" },
  { id: 6, name: "Mahmoud Al-Husary" },
  { id: 10, name: "Saud Al-Shuraym" },
];

/**
 * Formats seconds into mm:ss display string.
 * @param {number} s
 * @returns {string}
 */
function fmt(s) {
  if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {string}  props.verseKey   - e.g. "2:255" — used to fetch the audio URL
 * @param {string}  [props.className]
 */
export default function AudioPlayer({ verseKey, className }) {
  const audioRef = useRef(null);

  // ── State Machine ──────────────────────────────────────────────────────────
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1); // index into SPEEDS array
  // Initialise from localStorage so the chosen reciter persists across pages
  const [reciterId, setReciterId] = useState(() => {
    if (typeof window === "undefined") return RECITERS[0].id;
    const saved = parseInt(localStorage.getItem("qalb_reciter_id") ?? "0", 10);
    return RECITERS.some((r) => r.id === saved) ? saved : RECITERS[0].id;
  });
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  /**
   * True only when swapping reciters mid-session.
   * Keeps the full player UI visible — only the play button shows a spinner.
   */
  const [isReloading, setIsReloading] = useState(false);

  // ── Fetch audio URL on mount / verse change / reciter change ──────────────
  useEffect(() => {
    if (!verseKey) return;

    // Distinguish first load (no URL yet) from a reciter swap (URL exists)
    const isReciterSwap = audioUrl !== null;

    if (isReciterSwap) {
      // Keep controls visible — just spin the play button
      setIsReloading(true);
      setIsPlaying(false);
    } else {
      setStatus("loading");
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }

    let cancelled = false;

    fetch(`/api/verse/audio?key=${encodeURIComponent(verseKey)}&reciter=${reciterId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.audioUrl) throw new Error("No URL in response");
        setAudioUrl(data.audioUrl);
        setStatus("ready");
        setIsReloading(false);
        // Reset position so the new reciter starts from the beginning
        setCurrentTime(0);
        setDuration(0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[AudioPlayer] URL fetch failed:", err.message);
        setStatus("error");
        setIsReloading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKey, reciterId]);

  // ── Apply playback speed to audio element ──────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[speedIdx];
    }
  }, [speedIdx]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || status !== "ready") return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("[AudioPlayer] Playback error:", e);
      setStatus("error");
    }
  }, [isPlaying, status]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);
  const handleLoadedMeta = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);
  const handleAudioError = useCallback(() => {
    setStatus("error");
    setIsPlaying(false);
  }, []);
  const handleRestart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);
  const handleSeek = useCallback((e) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, []);
  const cycleSpeed = useCallback(() => setSpeedIdx((i) => (i + 1) % SPEEDS.length), []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn("flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-border/30", className)}
      role="region"
      aria-label="Verse audio player"
    >
      {/* Hidden native audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMeta}
          onEnded={handleEnded}
          onError={handleAudioError}
        />
      )}

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {status === "loading" && (
        <div className="flex items-center gap-2 justify-center py-1">
          <Loader2 size={13} className="animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading recitation…</span>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────── */}
      {status === "error" && (
        <p className="text-xs text-muted-foreground text-center py-1">Audio unavailable for this verse.</p>
      )}

      {/* ── Player Controls ─────────────────────────────────────────── */}
      {(status === "ready" || isReloading) && (
        <>
          <div className="flex items-center gap-3">
            {/* Restart */}
            <button
              onClick={handleRestart}
              disabled={isReloading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Restart"
            >
              <RotateCcw size={13} />
            </button>

            {/* Play / Pause — shows spinner while fetching a new reciter URL */}
            <button
              onClick={handlePlayPause}
              disabled={isReloading}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-60 disabled:cursor-default"
              aria-label={isReloading ? "Loading reciter" : isPlaying ? "Pause" : "Play"}
            >
              {isReloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={13} />
              ) : (
                <Play size={13} className="ml-0.5" />
              )}
            </button>

            {/* Progress scrubber */}
            <div className="flex-1 relative h-1 bg-white/10 rounded-full">
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full pointer-events-none transition-all"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>

            {/* Time */}
            <span className="text-[10px] text-muted-foreground tabular-nums w-14 text-right shrink-0">
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            {/* Speed */}
            <button
              onClick={cycleSpeed}
              disabled={isReloading}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-8 text-center disabled:opacity-30"
              aria-label={`Speed ${SPEEDS[speedIdx]}x`}
            >
              {SPEEDS[speedIdx]}×
            </button>
          </div>

          {/* Reciter selector */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowReciterPicker((v) => !v)}
              className="text-[10px] text-muted-foreground/60 hover:text-accent transition-colors flex items-center gap-1"
              aria-label="Change reciter"
            >
              <span>{RECITERS.find((r) => r.id === reciterId)?.name ?? "Reciter"}</span>
              <span className="opacity-50">▾</span>
            </button>
          </div>

          {/* Reciter chips — shown when picker is open */}
          {showReciterPicker && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReciterId(r.id);
                    localStorage.setItem("qalb_reciter_id", String(r.id));
                    setShowReciterPicker(false);
                  }}
                  className={cn(
                    "text-[10px] px-2.5 py-1 rounded-full border transition-all duration-150",
                    r.id === reciterId
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-accent/40 hover:text-foreground",
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
