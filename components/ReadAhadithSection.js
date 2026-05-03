import Link from "next/link";

import { ChevronRight, ScrollText } from "lucide-react";

import { getHomeAhadithPreview } from "@/lib/constants/ahadith";

/**
 * Home — “Read Ahadith” block. Data from {@link getHomeAhadithPreview}; full list at /ahadith.
 */
export default function ReadAhadithSection() {
  const preview = getHomeAhadithPreview();

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-8 mb-8" aria-labelledby="read-ahadith-heading">
      <div className="rounded-3xl border border-border/40 bg-card/35 backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 md:px-5 border-b border-border/30 bg-primary/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/25">
              <ScrollText className="h-5 w-5 text-accent" aria-hidden />
            </div>
            <div>
              <h2 id="read-ahadith-heading" className="text-base font-semibold text-foreground tracking-tight">
                Read Ahadith
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Words of the Prophet ﷺ — same journey as the Quran, one heart at a time.
              </p>
            </div>
          </div>
          <Link
            href="/ahadith"
            className="inline-flex items-center justify-center gap-1 self-start sm:self-auto text-sm font-medium text-accent hover:text-accent/90 transition-colors rounded-lg px-3 py-2 border border-accent/25 hover:bg-accent/10"
          >
            Browse collection
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="divide-y divide-border/25">
          {preview.map((h) => (
            <li key={h.id} className="px-4 py-4 md:px-5 md:py-4.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/90 mb-1.5">{h.title}</p>
              <p className="arabic-text text-lg md:text-xl text-foreground/95 leading-relaxed mb-2">{h.arabic}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{h.translation}</p>
              <p className="text-xs text-muted-foreground/80 font-medium">{h.source}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
