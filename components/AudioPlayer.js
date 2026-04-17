/**
 * @fileoverview AudioPlayer Component
 *
 * Plays Quranic recitation audio for a given verse using the
 * Quran Foundation Audio API.
 *
 * Design:
 *  - Fetches audio URL client-side (avoids SSR audio issues)
 *  - Native HTML5 <audio> element — no external audio library needed
 *  - Exposes play/pause, progress scrubbing, and playback speed
 *  - Shows the reciter name so users know who is reciting
 *
 * Audio CDN: The Quran Foundation serves audio files from their CDN.
 * We use Mishary Rashid Alafasy (recitation ID 7) as the default —
 * universally recognized and most commonly used on Quran apps.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

/** CDN base for Quran Foundation audio files */
const AUDIO_CDN_BASE = "https://verses.quran.com";

/**
 * Builds the audio URL for a given verse from Alafasy's recitation.
 * Format: /Alafasy_128kbps/001001.mp3  (chapter zero-padded to 3 digits, verse to 3 digits)
 *
 * @param {string} verseKey - e.g. "2:255"
 * @returns {string} Full audio URL
 */
function buildAudioUrl(verseKey) {
  const [chapter, verse] = verseKey.split(":");
  const paddedChapter = chapter.padStart(3, "0");
  const paddedVerse = verse.padStart(3, "0");
  return `${AUDIO_CDN_BASE}/Alafasy_128kbps/${paddedChapter}${paddedVerse}.mp3`;
}

/**
 * Formats a time in seconds to mm:ss string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string} props.verseKey    - The verse to play (e.g. "2:255")
 * @param {string} [props.className]
 */
export default function AudioPlayer({ verseKey, className }) {
  // ── Refs ───────────────────────────────────────────────────────────────────

  /** Reference to the native <audio> element */
  const audioRef = useRef(null);

  // ── State ──────────────────────────────────────────────────────────────────

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hasError, setHasError] = useState(false);

  const audioUrl = buildAudioUrl(verseKey);

  // ── Effects ────────────────────────────────────────────────────────────────

  /** Reset player state whenever the verse changes */
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [verseKey]);

  /** Apply playback speed changes to the audio element */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // ── Event Handlers ─────────────────────────────────────────────────────────

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("[AudioPlayer] Playback error:", err);
      setHasError(true);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsPlaying(false);
  }, []);

  /**
   * Handles user scrubbing the progress bar.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleSeek = useCallback((e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const handleRestart = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);

  /** Cycle through 0.75×, 1×, 1.25×, 1.5× speeds */
  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  }, [speed]);

  // ── Progress percentage for custom styled range input ─────────────────────
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn("flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-border/30", className)}
      role="region"
      aria-label="Verse audio player"
    >
      {/* Native audio element — hidden, controlled programmatically */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />

      {hasError ? (
        <p className="text-xs text-muted-foreground text-center">Audio unavailable for this verse.</p>
      ) : (
        <>
          {/* ── Controls Row ───────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Restart button */}
            <button
              onClick={handleRestart}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Restart recitation"
            >
              <RotateCcw size={14} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/80",
              )}
              aria-label={isPlaying ? "Pause recitation" : "Play recitation"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            {/* Progress bar */}
            <div className="flex-1 relative h-1 bg-white/10 rounded-full">
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full pointer-events-none"
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
                aria-label="Seek position"
              />
            </div>

            {/* Time display */}
            <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Speed toggle */}
            <button
              onClick={cycleSpeed}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-8 text-center"
              aria-label={`Playback speed: ${speed}x. Click to change.`}
            >
              {speed}×
            </button>
          </div>

          {/* Reciter label */}
          <p className="text-[10px] text-muted-foreground/60 text-center">Recited by Mishary Rashid Alafasy</p>
        </>
      )}
    </div>
  );
}
