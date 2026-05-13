/**
 * Ahadith section — stacked narration cards (matches vertical `<ol className="space-y-4">`).
 */
export default function AhadithSectionLoading() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8 space-y-6 animate-fade-in-up">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
          <div className="h-4 w-10 rounded-md animate-shimmer" />
          <div className="h-4 w-2 rounded-md bg-border/20 shrink-0 self-center" aria-hidden />
          <div className="h-4 w-14 rounded-md animate-shimmer" />
          <div className="h-4 w-2 rounded-md bg-border/20 shrink-0 self-center" aria-hidden />
          <div className="h-4 w-28 rounded-md animate-shimmer" />
          <div className="h-4 w-2 rounded-md bg-border/20 shrink-0 self-center" aria-hidden />
          <div className="h-4 w-36 max-w-[12rem] rounded-md animate-shimmer" />
        </div>
        <div className="h-4 w-28 rounded-md animate-shimmer" />
        <div className="h-7 w-full max-w-lg rounded-lg animate-shimmer" />
        <div className="h-3 w-48 rounded-md animate-shimmer" />
        <ol className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border/35 bg-card/25 px-4 py-4 md:px-5 space-y-3">
              <div className="h-3 w-24 rounded-md animate-shimmer" />
              <div className="h-16 rounded-xl animate-shimmer w-full opacity-90" />
              <div className="h-3 rounded-md animate-shimmer w-full" />
              <div className="h-3 rounded-md animate-shimmer w-[92%]" />
              <div className="h-3 rounded-md animate-shimmer w-[70%]" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
