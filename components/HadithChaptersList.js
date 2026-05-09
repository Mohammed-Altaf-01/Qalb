"use client";

import { useMemo, useState } from "react";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";

function normalize(text) {
  return String(text ?? "").toLowerCase().trim();
}

export default function HadithChaptersList({ bookSlug, chapters }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return chapters ?? [];
    return (chapters ?? []).filter((ch) => normalize(ch.title).includes(q) || normalize(ch.id).includes(q));
  }, [chapters, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/55" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chapters..."
          className="w-full rounded-xl border border-border/45 bg-card/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/55 focus:outline-none focus:border-accent/50"
        />
      </div>
      <ol className="rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/25 overflow-hidden">
        {filtered.map((ch, i) => (
          <li key={ch.id}>
            <Link
              href={`/ahadith/${bookSlug}/${ch.id}`}
              className="flex items-start gap-3 px-4 py-3.5 md:px-5 hover:bg-primary/5 transition-colors group"
            >
              <span className="text-xs font-mono text-muted-foreground/70 tabular-nums w-7 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground group-hover:text-accent transition-colors block">{ch.title}</span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  Hadith {ch.hadithFirst}
                  {ch.hadithLast !== ch.hadithFirst ? `–${ch.hadithLast}` : ""}
                </span>
              </div>
              <ChevronRight
                className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-accent transition-colors"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
