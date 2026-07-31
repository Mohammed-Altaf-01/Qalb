"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

import {
  KHATM_UPDATED_EVENT,
  firstUnreadPageInJuz,
  getKhatmStats,
  loadKhatmPages,
  saveKhatmPages,
} from "@/lib/khatm-progress";
import { toLocalDayKey } from "@/lib/local-calendar-day";
import { ACCOUNT_STORAGE_SYNCED_EVENT } from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

export default function KhatmClient() {
  const [readPages, setReadPages] = useState(() => new Set());
  const [showAllPages, setShowAllPages] = useState(false);
  const [expandedJuz, setExpandedJuz] = useState(null);

  const reload = useCallback(() => {
    setReadPages(loadKhatmPages());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(KHATM_UPDATED_EVENT, reload);
    window.addEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(KHATM_UPDATED_EVENT, reload);
      window.removeEventListener(ACCOUNT_STORAGE_SYNCED_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  const persist = useCallback((nextSet) => {
    setReadPages(nextSet);
    saveKhatmPages(nextSet);
  }, []);

  const toggle = useCallback(
    (p) => {
      const next = new Set(readPages);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      persist(next);
    },
    [readPages, persist],
  );

  const stats = useMemo(() => getKhatmStats(readPages), [readPages]);

  const estCompletion = useMemo(() => {
    const done = stats.done;
    if (done < 15) return "Keep reading in mushaf mode — projection appears after ~15 pages marked.";
    const recentWindow = Math.min(done, 30);
    const pagesPerDay = recentWindow / 14;
    if (pagesPerDay < 0.08) return "At this pace completion is farther out — gently increase cadence.";
    const remaining = stats.total - done;
    const days = Math.ceil(remaining / Math.max(pagesPerDay, 0.05));
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `Rough estimate: ~${days} days (≈ ${d.toLocaleDateString(undefined, { dateStyle: "medium" })}) at recent pace`;
  }, [stats.done, stats.total]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/30 bg-card p-5 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Khatm progress</p>
            <p className="text-3xl font-bold text-accent tabular-nums">{stats.overallPct}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.done} / {stats.total} mushaf pages
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground text-right max-w-[10rem]">
            Auto-updates when you read in mushaf mode
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, stats.overallPct)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{estCompletion}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.juzs.map((j) => {
          const complete = j.done >= j.total;
          const expanded = expandedJuz === j.num;
          const continuePage = firstUnreadPageInJuz(j.num, readPages);
          return (
            <div
              key={j.num}
              className={cn(
                "rounded-xl border p-3 space-y-2 transition-colors",
                complete ? "border-accent/40 bg-accent/5" : "border-border/40 bg-card",
              )}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 text-left"
                onClick={() => setExpandedJuz(expanded ? null : j.num)}
              >
                <span className="text-sm font-semibold text-foreground">
                  Juz {j.num}
                  {complete ? <span className="text-accent ml-1">✓</span> : null}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {j.done}/{j.total}
                </span>
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full bg-accent/70 rounded-full" style={{ width: `${j.pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pages {j.firstPage}–{j.lastPage} · {j.pct}%
              </p>
              {expanded ? (
                <Link
                  href={`/read?layout=mushaf&page=${continuePage}`}
                  className="inline-block text-[11px] text-accent underline underline-offset-2"
                >
                  {complete ? "Review in Read" : "Continue in Read"} →
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAllPages((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/20"
        >
          All pages (manual)
          {showAllPages ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showAllPages ? (
          <div className="px-4 pb-4 space-y-2 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground pt-2">
              Toggle individual pages if needed. Stored per device ({toLocalDayKey()}).
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1 max-h-64 overflow-y-auto">
              {Array.from({ length: stats.total }, (_, idx) => idx + 1).map((page) => {
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
        ) : null}
      </div>
    </div>
  );
}
