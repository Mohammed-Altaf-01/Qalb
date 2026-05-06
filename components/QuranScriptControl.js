"use client";

import { useEffect, useState } from "react";

import { Languages } from "lucide-react";

import { LS_QURAN_SCRIPT, LS_QURAN_TAJWEED, QURAN_SCRIPTS, normalizeQuranScript } from "@/lib/quran-text-preferences";
import { schedulePushPreferences } from "@/lib/user-app-sync-bridge";
import { cn } from "@/lib/utils";

const SCRIPT_OPTIONS = [
  { id: QURAN_SCRIPTS.UTHMANI, label: "Uthmani" },
  { id: QURAN_SCRIPTS.INDOPAK, label: "IndoPak" },
];

const PREVIEW_UTHMANI = "وَالضُّحَىٰ ۝ وَاللَّيْلِ إِذَا سَجَىٰ ۝ مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ";
const PREVIEW_INDOPAK = "وَالضُّحٰى ۝ وَالَّيْلِ اِذَا سَجٰى ۝ مَا وَدَّعَكَ رَبُّكَ وَمَا قَلٰى";
const PREVIEW_TAJWEED =
  "<span class='tajweed-ghunnah'>وَ</span><span class='tajweed-madd'>الضُّحَىٰ</span> " +
  "<span class='tajweed-idgham'>وَ</span><span class='tajweed-ikhfa'>اللَّيْلِ</span> إِذَا سَجَىٰ " +
  "<span class='tajweed-qalqalah'>مَا</span> وَدَّعَكَ <span class='tajweed-madd'>رَبُّكَ</span> وَمَا قَلَىٰ";

export default function QuranScriptControl() {
  const [script, setScript] = useState(QURAN_SCRIPTS.UTHMANI);
  const [tajweed, setTajweed] = useState(false);

  useEffect(() => {
    try {
      setScript(normalizeQuranScript(localStorage.getItem(LS_QURAN_SCRIPT)));
      setTajweed(localStorage.getItem(LS_QURAN_TAJWEED) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function persistScript(next) {
    const scriptId = normalizeQuranScript(next);
    setScript(scriptId);
    try {
      localStorage.setItem(LS_QURAN_SCRIPT, scriptId);
    } catch {
      /* ignore */
    }
    schedulePushPreferences();
  }

  function persistTajweed(next) {
    setTajweed(next);
    try {
      localStorage.setItem(LS_QURAN_TAJWEED, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    schedulePushPreferences();
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-[26rem]">
      <div className="flex items-center gap-2">
        <Languages size={13} className="text-muted-foreground/65 shrink-0 hidden sm:block" aria-hidden />
        <div className="flex items-center gap-1 rounded-lg border border-border/35 bg-muted/25 p-0.5">
          {SCRIPT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => persistScript(option.id)}
              className={cn(
                "text-[10px] font-semibold px-2 py-1 rounded-md transition-colors min-w-[3.4rem]",
                script === option.id
                  ? "bg-accent/20 text-accent border border-accent/35"
                  : "text-muted-foreground hover:text-foreground border border-transparent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={tajweed}
          onClick={() => persistTajweed(!tajweed)}
          className={cn(
            "text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors",
            tajweed
              ? "bg-accent/20 text-accent border-accent/35"
              : "bg-muted/25 text-muted-foreground border-border/35 hover:text-foreground",
          )}
        >
          Tajweed
        </button>
      </div>

      <div className="rounded-lg border border-border/35 bg-background/30 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1">Preview • Surah Ad-Duha</p>
        {tajweed ? (
          <p
            className="arabic-text arabic-text-display quran-tajweed text-foreground/90"
            lang="ar"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: PREVIEW_TAJWEED }}
          />
        ) : (
          <p className="arabic-text arabic-text-display text-foreground/90" lang="ar" dir="rtl">
            {script === QURAN_SCRIPTS.INDOPAK ? PREVIEW_INDOPAK : PREVIEW_UTHMANI}
          </p>
        )}
      </div>
    </div>
  );
}
