/**
 * Read route loading — vertical surah rows (matches ReadClient picker / list).
 */
export default function ReadLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-8 py-6 space-y-6 animate-fade-in-up">
      <div className="text-center space-y-2">
        <div className="h-6 w-52 rounded-lg animate-shimmer mx-auto" />
        <div className="h-3 w-64 rounded-md animate-shimmer mx-auto" />
      </div>
      <div className="flex justify-end">
        <div className="h-8 w-40 rounded-lg animate-shimmer" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/25"
          >
            <div className="h-9 w-9 rounded-full shrink-0 animate-shimmer" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3.5 rounded-md animate-shimmer w-[36%]" />
              <div className="h-3 rounded-md animate-shimmer w-[55%]" />
            </div>
            <div className="hidden sm:block w-16 space-y-1 text-right">
              <div className="h-3 rounded-md animate-shimmer w-full ml-auto" />
              <div className="h-2.5 rounded-md animate-shimmer w-10 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
