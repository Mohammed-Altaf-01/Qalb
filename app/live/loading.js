"use client";

export default function LiveLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 pb-24 md:pb-12 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-accent/20" />
        <div className="h-8 w-64 rounded bg-muted/40" />
        <div className="h-4 w-80 rounded bg-muted/30" />
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/35 p-4 space-y-4">
        <div className="flex gap-2">
          <div className="h-7 w-24 rounded-full bg-muted/35" />
          <div className="h-7 w-24 rounded-full bg-muted/35" />
        </div>
        <div className="h-[260px] md:h-[360px] rounded-xl border border-border/35 bg-gradient-to-br from-emerald-950/40 via-background to-amber-900/20" />
      </div>
    </div>
  );
}
