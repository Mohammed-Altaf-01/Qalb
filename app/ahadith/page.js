import Link from "next/link";

import { ArrowLeft, ScrollText } from "lucide-react";

import { AHADITH_COLLECTION } from "@/lib/constants/ahadith";

export const metadata = {
  title: "Read Ahadith · Qalb",
  description: "Read selected ahadith from the Prophet ﷺ alongside your Quran journey.",
};

export default function AhadithPage() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <header className="flex items-start gap-3 mb-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 border border-accent/25">
            <ScrollText className="h-5 w-5 text-accent" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Read Ahadith</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              A starter collection for reflection. Later this can tie into reading streaks, notes, and discovery — one
              unified experience with the Quran.
            </p>
          </div>
        </header>

        <ol className="space-y-0 rounded-2xl border border-border/40 bg-card/30 overflow-hidden divide-y divide-border/25">
          {AHADITH_COLLECTION.map((h, index) => (
            <li key={h.id} className="px-4 py-5 md:px-6 md:py-6">
              <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="text-sm font-semibold text-accent mt-1 mb-2">{h.title}</h2>
              <p className="arabic-text text-xl md:text-2xl text-foreground/95 leading-relaxed mb-3">{h.arabic}</p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">{h.translation}</p>
              <p className="text-xs text-muted-foreground/85 font-medium">{h.source}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
