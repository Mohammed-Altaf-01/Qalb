"use client";

import { useMemo, useState } from "react";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";

function normalize(text) {
  return String(text ?? "").toLowerCase().trim();
}

export default function HadithBooksList({ books }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return books ?? [];
    return (books ?? []).filter((b) => normalize(b.name).includes(q) || normalize(b.slug).includes(q));
  }, [books, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/55" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hadith books..."
          className="w-full rounded-xl border border-border/45 bg-card/40 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/55 focus:outline-none focus:border-accent/50"
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <li key={b.slug}>
            <Link
              href={`/ahadith/${b.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-border/40 bg-card/35 px-4 py-4 backdrop-blur-sm transition-colors hover:border-accent/35 hover:bg-card/50"
            >
              <span className="font-semibold text-foreground group-hover:text-accent transition-colors">{b.name}</span>
              <span className="text-xs text-muted-foreground mt-1">{b.sectionCount} chapters</span>
              <span className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-accent">
                Open
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
