/**
 * Discover route loading — mirrors the real page: header, textarea, chips, vertical result cards.
 */
export default function DiscoverLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-2xl animate-shimmer" />
        <div className="h-7 w-56 rounded-xl animate-shimmer" />
        <div className="h-3 w-72 max-w-full rounded-md animate-shimmer" />
      </div>
      <div className="h-28 rounded-xl animate-shimmer w-full" />
      <div className="flex flex-wrap justify-between gap-3">
        <div className="h-3 w-24 rounded-md animate-shimmer" />
        <div className="h-9 w-32 rounded-lg animate-shimmer" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[100, 120, 90, 110, 130, 95].map((w) => (
          <div key={w} className="h-8 rounded-full animate-shimmer" style={{ width: w }} />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-2">
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-full shrink-0 animate-shimmer" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3 rounded-md animate-shimmer w-[30%]" />
                <div className="h-3.5 rounded-md animate-shimmer w-full" />
                <div className="h-3.5 rounded-md animate-shimmer w-[88%]" />
                <div className="h-3 rounded-md animate-shimmer w-[70%]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
