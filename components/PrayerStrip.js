"use client";

import { useEffect, useState } from "react";

/** Next salah label + ETA from bundled prayer names (server returns HH:MM local). */
export default function PrayerStrip() {
  const [line, setLine] = useState("");

  useEffect(() => {
    let cancelled = false;
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
          if (!cancelled) setLine("");
          return;
        }
        const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        const nowMs = Date.now();
        /** @type {Array<{ name: string, t: number }>} */
        const slots = [];
        for (const name of order) {
          const s = timings[name];
          if (typeof s !== "string") continue;
          const t = parseLoosePrayerToday(s);
          if (t) slots.push({ name, t: t.getTime() });
        }
        slots.sort((a, b) => a.t - b.t);
        const next = slots.find((x) => x.t > nowMs) ?? slots[0];
        if (!next) {
          if (!cancelled) setLine("");
          return;
        }
        const diff = Math.max(0, next.t - nowMs);
        const m = Math.floor(diff / 60_000);
        if (!cancelled) setLine(`Next • ${next.name} in ${m} min`);
      } catch {
        if (!cancelled) setLine("");
      }
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!line) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 pb-2 md:pb-1">
      <p className="text-[10px] text-muted-foreground/90 truncate text-center md:text-start">{line}</p>
    </div>
  );
}

function parseLoosePrayerToday(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d;
}
