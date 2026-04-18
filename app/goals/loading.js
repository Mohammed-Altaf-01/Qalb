/**
 * Goals page loading skeleton.
 */
export default function GoalsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-28 rounded-lg animate-shimmer" />
          <div className="h-3 w-44 rounded animate-shimmer" />
        </div>
        <div className="h-8 w-24 rounded-lg animate-shimmer" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg animate-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded animate-shimmer" />
              <div className="h-3 w-3/4 rounded animate-shimmer" />
            </div>
          </div>
          <div className="h-1.5 rounded-full animate-shimmer" />
          <div className="h-8 rounded-lg animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
