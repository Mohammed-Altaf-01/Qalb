"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { GRADES, scheduleReview } from "@/lib/spaced-repetition";
import { toLocalDayKey } from "@/lib/local-calendar-day";
import { cn } from "@/lib/utils";

const LS_HIFZ = "qalb_hifz_progress_v1";

export default function HifzClient() {
  const [cards, setCards] = useState({});
  const [key, setKey] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_HIFZ) ?? "{}");
      setCards(raw && typeof raw === "object" ? raw : {});
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next) => {
    localStorage.setItem(LS_HIFZ, JSON.stringify(next));
    setCards(next);
  }, []);

  const today = toLocalDayKey();

  const loadAudio = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/verse/audio?key=${encodeURIComponent(key.trim())}&reciter=7`);
      const js = await res.json();
      setAudioUrl(js?.audioUrl ?? "");
    } catch {
      setAudioUrl("");
    } finally {
      setLoading(false);
    }
  };

  const schedule = useCallback(
    (grade) => {
      const cur = cards[key]?.scheduling ?? {};
      const nextScheduling = scheduleReview(cur, grade, today);
      const next = {
        ...cards,
        [key]: { scheduling: nextScheduling, updatedAt: Date.now() },
      };
      persist(next);
    },
    [cards, key, persist, today],
  );

  const dueSoon = useMemo(() => {
    return Object.entries(cards)
      .filter(([, v]) => v?.scheduling?.dueDayKey && v.scheduling.dueDayKey <= today)
      .map(([k]) => k)
      .slice(0, 15);
  }, [cards, today]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground flex flex-col gap-1">
          Verse key
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-border/50 bg-background"
            placeholder="2:255"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAudio()}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-95"
          >
            Load audio clip
          </button>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-accent" aria-label="loading" /> : null}
        </div>
        {audioUrl ? <audio controls className="w-full mt-2" src={audioUrl} /> : null}

        <p className="text-[11px] text-muted-foreground">Grade recall after listening — spaced repetition adjusts the next due day.</p>
        <div className="flex flex-wrap gap-2">
          {[
            ["Again", GRADES.AGAIN],
            ["Hard", GRADES.HARD],
            ["Good", GRADES.GOOD],
            ["Easy", GRADES.EASY],
          ].map(([label, g]) => (
            <button
              key={label}
              type="button"
              onClick={() => schedule(g)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors border-border/40 bg-muted/20 hover:bg-accent/15",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Next due:{" "}
          <span className="text-foreground">{cards[key]?.scheduling?.dueDayKey ?? "—"}</span> · interval{" "}
          {cards[key]?.scheduling?.intervalDays ?? "—"}d · reps {cards[key]?.scheduling?.reps ?? "—"}
        </p>
      </div>

      {dueSoon.length > 0 && (
        <div className="rounded-2xl border border-accent/35 bg-accent/5 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Due or overdue ({dueSoon.length})</p>
          <div className="flex flex-wrap gap-1">
            {dueSoon.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKey(k)}
                className="text-[11px] px-2 py-1 rounded-full border border-border/40 hover:border-accent/50"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
