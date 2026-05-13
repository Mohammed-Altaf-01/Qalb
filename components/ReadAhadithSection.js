import { ChevronRight, ScrollText } from "lucide-react";
import Link from "next/link";

import { getHomeAhadithPreview } from "@/lib/constants/ahadith";

/**
 * @param {{ books?: { slug: string; name: string; sectionCount: number }[] }} props
 * Home + /ahadith footer: quick entry to hadith collections and one curated preview.
 */
export default function ReadAhadithSection({ books = [] }) {
  const preview = getHomeAhadithPreview();
  const featured = preview[0];
  const quickBooks = books.slice(0, 6);

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
                Bukhari, Muslim, Nasa&apos;i, Muwatta, and more — by book, chapter, and narration.
              </p>
            </div>
          </div>
          <Link
            href="/ahadith"
            className="inline-flex items-center justify-center gap-1 self-start sm:self-auto text-sm font-medium text-accent hover:text-accent/90 transition-colors rounded-lg px-3 py-2 border border-accent/25 hover:bg-accent/10"
          >
            Full library
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {quickBooks.length > 0 && (
          <div className="px-4 py-3 md:px-5 border-b border-border/25 flex flex-wrap gap-2">
            {quickBooks.map((b) => (
              <Link
                key={b.slug}
                href={`/ahadith/${b.slug}`}
                className="inline-flex items-center rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground/90 hover:border-accent/40 hover:text-accent transition-colors"
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}

        {featured && (
          <div className="px-4 py-4 md:px-5 md:py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/90 mb-1.5">Featured</p>
            <p className="arabic-text text-lg md:text-xl text-foreground/95 leading-relaxed mb-2">{featured.arabic}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">{featured.translation}</p>
            <p className="text-xs text-muted-foreground/80 font-medium">{featured.source}</p>
          </div>
        )}
      </div>
    </section>
  );
}
