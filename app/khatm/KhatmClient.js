"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toLocalDayKey } from "@/lib/local-calendar-day";
import { cn } from "@/lib/utils";

const LS_KHATM = "qalb_khatm_pages_v1";

export default function KhatmClient() {
  const [readPages, setReadPages] = useState(() => new Set());
  const [, bump] = useState(0);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KHATM) ?? "[]");
      setReadPages(new Set(Array.isArray(raw) ? raw.filter((n) => Number.isFinite(n) && n >= 1 && n <= 604) : []));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((nextSet) => {
    try {
      localStorage.setItem(LS_KHATM, JSON.stringify([...nextSet].sort((a, b) => a - b)));
      bump((n) => n + 1);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (p) => {
      const next = new Set(readPages);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      setReadPages(next);
      persist(next);
    },
    [readPages, persist],
  );

  const done = readPages.size;
  const pct = Math.round((done / 604) * 1000) / 10;

  const estCompletion = useMemo(() => {
    if (done < 15) return "Keep logging pages — projection appears after ~15 marks.";
    const recentWindow = Math.min(done, 30);
    const pagesPerDay = recentWindow / 14;
    if (pagesPerDay < 0.08) return "At this pace completion is farther out — gently increase cadence.";
    const remaining = 604 - done;
    const days = Math.ceil(remaining / Math.max(pagesPerDay, 0.05));
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `Rough estimate: ~${days} days (≈ ${d.toLocaleDateString(undefined, { dateStyle: "medium" })}) at recent pace`;
  }, [done]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{estCompletion}</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center rounded-2xl border border-border/40 bg-card p-4">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Marked</p>
          <p className="text-lg font-semibold text-accent">{done}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
          <p className="text-lg font-semibold text-foreground">{604 - done}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Progress</p>
          <p className="text-lg font-semibold text-foreground">{pct}%</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Toggle Madinah mushaf pages you have meaningfully covered (listening counts). Stored per device ({toLocalDayKey()}
        ).
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1">
        {Array.from({ length: 604 }, (_, idx) => idx + 1).map((page) => {
          const marked = readPages.has(page);
          return (
            <button
              type="button"
              key={page}
              aria-label={`Page ${page}`}
              onClick={() => toggle(page)}
              className={cn(
                "h-7 rounded text-[9px] font-medium border transition-colors",
                marked
                  ? "bg-accent/30 border-accent/50 text-foreground"
                  : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40",
              )}
            >
              {page}
            </button>
          );
        })}
      </div>
    </div>
  );
}
