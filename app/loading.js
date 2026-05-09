/**
 * Root loading UI — vertical list feel (matches home / read surah list), not a fake 2-column grid.
 */
export default function RootLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 animate-fade-in-up space-y-6">
      <div className="text-center space-y-2 mb-2">
        <div className="h-7 w-48 rounded-lg animate-shimmer mx-auto" />
        <div className="h-3 w-56 rounded-md animate-shimmer mx-auto" />
      </div>
      <div className="rounded-2xl border border-border/35 bg-card/25 p-3 space-y-2">
        <div className="h-3 w-24 rounded-md animate-shimmer" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-28 rounded-lg animate-shimmer" />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border/25 bg-card/20"
          >
            <div className="h-9 w-9 rounded-full shrink-0 animate-shimmer" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3.5 rounded-md animate-shimmer w-[40%]" />
              <div className="h-3 rounded-md animate-shimmer w-[65%]" />
            </div>
            <div className="h-3 w-8 rounded animate-shimmer shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
