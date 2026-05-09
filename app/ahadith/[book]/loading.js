/**
 * Ahadith book chapters — vertical bordered list rows (matches chapter `<ol>`).
 */
export default function AhadithBookLoading() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-wrap gap-2">
          <div className="h-4 w-12 rounded-md animate-shimmer" />
          <div className="h-4 w-1 rounded-md bg-transparent" />
          <div className="h-4 w-16 rounded-md animate-shimmer" />
          <div className="h-4 w-1 rounded-md bg-transparent" />
          <div className="h-4 w-32 rounded-md animate-shimmer" />
        </div>
        <div className="h-4 w-24 rounded-md animate-shimmer" />
        <div className="h-8 w-64 max-w-full rounded-lg animate-shimmer" />
        <div className="h-3.5 w-full max-w-md rounded-md animate-shimmer" />
        <ol className="rounded-2xl border border-border/40 bg-card/30 divide-y divide-border/25 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-3.5 md:px-5">
              <div className="h-3.5 w-7 rounded-md animate-shimmer shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2 py-0.5">
                <div className="h-3.5 rounded-md animate-shimmer w-[88%]" />
                <div className="h-3 rounded-md animate-shimmer w-32" />
              </div>
              <div className="h-4 w-4 rounded shrink-0 mt-1 animate-shimmer opacity-60" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
