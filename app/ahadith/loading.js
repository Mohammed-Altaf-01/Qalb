/**
 * Ahadith index — book grid skeleton (matches sm:grid-cols-2 lg:grid-cols-3 cards).
 */
export default function AhadithLoading() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-5xl px-4 md:px-8 pt-6 md:pt-8 space-y-8 animate-fade-in-up">
        <div className="h-4 w-28 rounded-md animate-shimmer" />
        <div className="space-y-3 max-w-2xl">
          <div className="h-4 w-36 rounded-md animate-shimmer" />
          <div className="h-9 w-56 rounded-lg animate-shimmer" />
          <div className="h-3.5 rounded-md animate-shimmer w-full max-w-xl" />
          <div className="h-3.5 rounded-md animate-shimmer w-full max-w-lg" />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl border border-border/40 bg-card/35 px-4 py-4 min-h-[7.5rem] flex flex-col gap-2"
            >
              <div className="h-4 rounded-md animate-shimmer w-[72%]" />
              <div className="h-3 rounded-md animate-shimmer w-24" />
              <div className="mt-auto h-3 rounded-md animate-shimmer w-16" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
