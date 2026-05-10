"use client";

import { useEffect, useState } from "react";

import { Headphones } from "lucide-react";

import { READ_RECITERS } from "@/lib/read-reciters";
import { cleanTranslationText } from "@/lib/translation-utils";
const DEFAULT_TRIPLE = [20, 85, 22];
/** @type {Array<[string,number]>} */
const DEFAULT_RECITER_TRIPLE = [7, 3, 2].map((id) => {
  const r = READ_RECITERS.find((x) => x.id === id);
  return [r?.name ?? `Reciter ${id}`, id];
});

/**
 * Lightweight compare rows for verse detail — avoids duplicating verse fetch pipeline inside the picker.
 */
export default function VerseComparePanels({ verseKey }) {
  const [translations, setTranslations] = useState(null);
  const [recUrls, setRecUrls] = useState(null);
  const [loadingT, setLoadingT] = useState(false);

  async function refreshTranslations() {
    setLoadingT(true);
    try {
      const texts = await Promise.all(
        DEFAULT_TRIPLE.map(async (tid) => {
          try {
            const res = await fetch(`/api/verse/by-key?key=${encodeURIComponent(verseKey)}&translation=${tid}`);
            if (!res.ok) throw new Error("x");
            const data = await res.json();
            const raw = data?.verse?.translations?.[0]?.text ?? "";
            return cleanTranslationText(String(raw).replace(/<[^>]*>/g, ""));
          } catch {
            return "—";
          }
        }),
      );
      setTranslations(texts.map((text, idx) => ({ id: DEFAULT_TRIPLE[idx], text })));
    } finally {
      setLoadingT(false);
    }
  }

  async function refreshReciters() {
    try {
      const urls = await Promise.all(
        DEFAULT_RECITER_TRIPLE.map(async ([_, id]) => {
          try {
            const res = await fetch(`/api/verse/audio?key=${encodeURIComponent(verseKey)}&reciter=${id}`);
            const data = await res.json();
            return data?.audioUrl ?? null;
          } catch {
            return null;
          }
        }),
      );
      setRecUrls(urls.map((url, idx) => ({ name: DEFAULT_RECITER_TRIPLE[idx][0], id: DEFAULT_RECITER_TRIPLE[idx][1], url })));
    } catch {
      setRecUrls(null);
    }
  }

  useEffect(() => {
    setTranslations(null);
    setRecUrls(null);
  }, [verseKey]);

  return (
    <section className="rounded-2xl border border-border/45 bg-muted/15 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Compare translations</p>
        <button
          type="button"
          onClick={() => void refreshTranslations()}
          className="text-[11px] text-accent hover:underline"
        >
          {loadingT ? "Loading…" : translations ? "Refresh" : "Load trio"}
        </button>
      </div>
      {translations?.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {translations.map((row) => (
            <div key={row.id} className="rounded-xl border border-border/40 bg-card/60 p-3 text-xs text-foreground/85">
              <p className="text-[10px] text-muted-foreground mb-1">ID {row.id}</p>
              <p className="reading-prose leading-relaxed">{row.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">Shows Saheeh International, Abdel Haleem, and Yusuf Ali side by side.</p>
      )}

      <div className="border-t border-border/30 pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1">
            <Headphones size={12} aria-hidden />
            Compare reciters
          </p>
          <button type="button" onClick={() => void refreshReciters()} className="text-[11px] text-accent hover:underline">
            {recUrls ? "Refresh" : "Load clips"}
          </button>
        </div>
        {recUrls?.length ? (
          <div className="space-y-2">
            {recUrls.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/40 bg-card/50 p-2">
                <p className="text-[10px] text-muted-foreground mb-1">{r.name}</p>
                {r.url ? <audio controls className="w-full h-8" src={r.url} /> : <p className="text-[10px] text-red-400/70">Unavailable</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">Verse samples from Mishari · Sudais · Abdul Baset Murattal.</p>
        )}
      </div>
    </section>
  );
}
