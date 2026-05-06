import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, ChevronRight } from "lucide-react";

import { getHadithChaptersForBook } from "@/lib/hadith-catalog";

export async function generateMetadata({ params }) {
  const p = await Promise.resolve(params);
  const data = getHadithChaptersForBook(p.book);
  return {
    title: data ? `${data.name} · Chapters · Qalb` : "Ahadith · Qalb",
  };
}

export default async function AhadithBookPage({ params }) {
  const p = await Promise.resolve(params);
  const data = getHadithChaptersForBook(p.book);
  if (!data) notFound();

  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/ahadith" className="hover:text-foreground transition-colors">
            Ahadith
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium truncate">{data.name}</span>
        </div>

        <Link
          href="/ahadith"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All books
        </Link>

        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-2">{data.name}</h1>
        <p className="text-sm text-muted-foreground mb-6">Select a chapter to read the ahadith in that section.</p>

        <ol className="rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/25 overflow-hidden">
          {data.chapters.map((ch, i) => (
            <li key={ch.id}>
              <Link
                href={`/ahadith/${p.book}/${ch.id}`}
                className="flex items-start gap-3 px-4 py-3.5 md:px-5 hover:bg-primary/5 transition-colors group"
              >
                <span className="text-xs font-mono text-muted-foreground/70 tabular-nums w-7 shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground group-hover:text-accent transition-colors block">
                    {ch.title}
                  </span>
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
    </div>
  );
}
