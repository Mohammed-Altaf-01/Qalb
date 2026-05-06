"use client";

import { useEffect, useState } from "react";

import { ALargeSmall } from "lucide-react";

import {
  LS_READING_SCALE,
  normalizeReadingScale,
  applyReadingScaleToDocument,
  READING_SCALE_IDS,
} from "@/lib/reading-scale";
import { cn } from "@/lib/utils";

const LABELS = {
  comfortable: "L",
  standard: "M",
  compact: "S",
};

const TITLES = {
  comfortable: "Larger Qur’an & Hadith text",
  standard: "Medium text size",
  compact: "Smaller text size",
};

export default function ReadingScaleControl() {
  const [scale, setScale] = useState(READING_SCALE_IDS[0]);

  useEffect(() => {
    try {
      const saved = normalizeReadingScale(localStorage.getItem(LS_READING_SCALE));
      setScale(saved);
      applyReadingScaleToDocument(saved);
    } catch {
      applyReadingScaleToDocument("comfortable");
    }
  }, []);

  function setAndPersist(next) {
    const id = normalizeReadingScale(next);
    setScale(id);
    try {
      localStorage.setItem(LS_READING_SCALE, id);
    } catch {
      /* ignore */
    }
    applyReadingScaleToDocument(id);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border/35 bg-muted/25 p-0.5"
      role="group"
      aria-label="Text size for Quran and Hadith reading"
    >
      <span className="sr-only">Reading text size</span>
      <ALargeSmall size={13} className="text-muted-foreground/65 shrink-0 ml-1 hidden sm:block" aria-hidden />
      {READING_SCALE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          title={TITLES[id]}
          aria-pressed={scale === id}
          onClick={() => setAndPersist(id)}
          className={cn(
            "text-[10px] font-semibold tabular-nums px-2 py-1 rounded-md transition-colors min-w-[2rem]",
            scale === id
              ? "bg-accent/20 text-accent border border-accent/35"
              : "text-muted-foreground hover:text-foreground border border-transparent",
          )}
        >
          {LABELS[id]}
        </button>
      ))}
    </div>
  );
}
