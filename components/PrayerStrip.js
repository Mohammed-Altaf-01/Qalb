"use client";

import { useCallback, useEffect, useState } from "react";

import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { isAdhanEnabled, schedulePrayerAdhan, setAdhanEnabled, stopPrayerAdhan } from "@/lib/prayer-adhan";
import { buildPrayerSlots, formatPrayerTime12h, pickNextPrayer } from "@/lib/prayer-times";
import { cn } from "@/lib/utils";

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

/** Next salah label + time; adhan at salah when tab is visible. */
export default function PrayerStrip() {
  const [display, setDisplay] = useState(null);
  const [adhanPlaying, setAdhanPlaying] = useState(false);
  const [adhanEnabled, setAdhanEnabledState] = useState(true);

  useEffect(() => {
    setAdhanEnabledState(isAdhanEnabled());
  }, []);

  const handleAdhanFire = useCallback((name) => {
    toast("Salah time", { description: name });
  }, []);

  function handleMicClick() {
    if (adhanPlaying) {
      stopPrayerAdhan();
      return;
    }
    const next = !adhanEnabled;
    setAdhanEnabled(next);
    setAdhanEnabledState(next);
  }

  useEffect(() => {
    let cancelled = false;
    let cancelSchedule = () => {};

    async function load() {
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem("qalb_prayer_coords") : null;
        const parsed = cached ? JSON.parse(cached) : null;
        const lat = typeof parsed?.lat === "number" ? parsed.lat : 21.3891;
        const lon = typeof parsed?.lon === "number" ? parsed.lon : 39.8579;
        const res = await fetch(`/api/prayer/times?latitude=${lat}&longitude=${lon}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const timings = json?.timings;
        if (!timings || typeof timings !== "object") {
          if (!cancelled) setDisplay(null);
          return;
        }

        const nowMs = Date.now();
        const slots = buildPrayerSlots(timings, PRAYER_ORDER);
        const next = pickNextPrayer(slots, nowMs);
        if (!next) {
          if (!cancelled) setDisplay(null);
          return;
        }

        if (!cancelled) {
          setDisplay({
            name: next.name,
            time12: formatPrayerTime12h(next.at),
          });
        }

        cancelSchedule();
        if (!cancelled) {
          cancelSchedule = schedulePrayerAdhan(slots, {
            onFire: handleAdhanFire,
            onPlayingChange: setAdhanPlaying,
          });
        }
      } catch {
        if (!cancelled) setDisplay(null);
      }
    }

    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      cancelSchedule();
    };
  }, [handleAdhanFire]);

  if (!display) return null;

  const micTitle = adhanPlaying
    ? "Mute azaan"
    : adhanEnabled
      ? `Azaan will play at ${display.name} (${display.time12})`
      : "Azaan muted — click to turn on";

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 pb-2 md:pb-1">
      <p className="text-[10px] text-muted-foreground/90 flex items-center justify-center md:justify-start gap-1.5">
        <span className="truncate">
          {display.name} on {display.time12}
        </span>
        <span className="relative shrink-0 group/mic">
          <button
            type="button"
            aria-label={micTitle}
            onClick={handleMicClick}
            className={cn(
              "inline-flex items-center justify-center rounded-sm p-0.5",
              "text-muted-foreground/90 hover:text-foreground hover:bg-muted/40 transition-colors",
              adhanEnabled && !adhanPlaying && "text-accent/80",
              adhanPlaying && "text-accent",
              !adhanEnabled && !adhanPlaying && "opacity-70",
            )}
          >
            {adhanEnabled ? (
              <Mic size={11} strokeWidth={2} aria-hidden />
            ) : (
              <MicOff size={11} strokeWidth={2} aria-hidden />
            )}
          </button>
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2",
              "whitespace-nowrap rounded-md border border-border/60 bg-popover px-2 py-1",
              "text-[10px] leading-tight text-popover-foreground shadow-md",
              "invisible opacity-0",
              "group-hover/mic:visible group-hover/mic:opacity-100",
              "group-focus-within/mic:visible group-focus-within/mic:opacity-100",
              "transition-opacity duration-75",
            )}
          >
            {micTitle}
          </span>
        </span>
      </p>
    </div>
  );
}
