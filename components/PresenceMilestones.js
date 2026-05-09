"use client";

import { useEffect, useRef, useState } from "react";

import { Heart, Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { useGamification } from "@/lib/useGamification";

const SESSION_SHOWN_KEY = "qalb_presence_milestones_shown_v1";

function readShownSet() {
  try {
    const raw = sessionStorage.getItem(SESSION_SHOWN_KEY);
    const arr = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markShown(id) {
  try {
    const s = readShownSet();
    s.add(id);
    sessionStorage.setItem(SESSION_SHOWN_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

function MilestoneCard({ title, body, onDismiss }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="presence-milestone-title"
      className="rounded-2xl border border-accent/35 bg-card/95 shadow-2xl backdrop-blur-md p-4 animate-fade-in-up w-full md:max-w-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <Heart size={16} className="text-accent" aria-hidden />
          </div>
          <h2 id="presence-milestone-title" className="text-sm font-semibold text-foreground leading-tight">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{body}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-accent flex items-center gap-1">
          <Sparkles size={11} aria-hidden />
          +1 XP
        </span>
        <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={onDismiss}>
          Alhamdulillah
        </Button>
      </div>
    </div>
  );
}

/**
 * After 5 min and 20 min in the app, then every hour — encouragement + 1 XP.
 */
export default function PresenceMilestones() {
  const { status } = useSession();
  const { award, state } = useGamification();
  const [open, setOpen] = useState(null);
  const timersRef = useRef([]);
  const scheduledRef = useRef(false);
  const awardRef = useRef(award);
  const stateRef = useRef(state);
  awardRef.current = award;
  stateRef.current = state;

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;

    const clearAll = () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };

    const show = (id, title, body) => {
      if (cancelled) return;
      const shown = readShownSet();
      if (shown.has(id)) return;
      markShown(id);
      try {
        awardRef.current?.("presence_milestone", { milestone: id });
      } catch {
        /* ignore */
      }
      setOpen({ id, title, body });
    };

    const schedule = (delayMs, id, title, body) => {
      const t = setTimeout(() => show(id, title, body), delayMs);
      timersRef.current.push(t);
    };

    const tryStart = () => {
      if (cancelled || scheduledRef.current) return;
      if (!stateRef.current) {
        const w = setTimeout(tryStart, 250);
        timersRef.current.push(w);
        return;
      }
      scheduledRef.current = true;

      const FIVE = 5 * 60 * 1000;
      const TWENTY = 20 * 60 * 1000;
      const HOUR = 60 * 60 * 1000;

      schedule(FIVE, "m5", "A few minutes with the Quran", "These moments matter. Allah sees your heart turning toward Him — keep going, even gently.");
      schedule(TWENTY, "m20", "Beautiful consistency", "Twenty minutes of presence builds barakah in your day. May this habit draw you closer to Him.");

      const tHourlyAnchor = setTimeout(() => {
        let n = 0;
        const tick = () => {
          if (cancelled) return;
          n += 1;
          show(`h${n}`, "Still here with you", "Every hour you spend seeking understanding is charity for your soul. +1 XP for your dedication.");
          const next = setTimeout(tick, HOUR);
          timersRef.current.push(next);
        };
        const first = setTimeout(tick, HOUR);
        timersRef.current.push(first);
      }, TWENTY);
      timersRef.current.push(tHourlyAnchor);
    };

    tryStart();

    return () => {
      cancelled = true;
      clearAll();
      scheduledRef.current = false;
    };
  }, [status]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[10000] bg-black/30 cursor-default border-0 p-0"
        aria-label="Dismiss"
        onClick={() => setOpen(null)}
      />
      <div className="pointer-events-none fixed inset-0 z-[10001] flex items-end justify-center md:items-end md:justify-end p-4 pb-24 md:pb-8">
        <div className="pointer-events-auto w-full md:w-auto">
          <MilestoneCard title={open.title} body={open.body} onDismiss={() => setOpen(null)} />
        </div>
      </div>
    </>
  );
}
