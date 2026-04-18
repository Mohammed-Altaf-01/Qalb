/**
 * Root loading skeleton — matches the 2-column desktop layout of page.js.
 * Next.js shows this automatically while the Server Component is rendering.
 */
export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 animate-fade-in-up">
      {/* Basmala + date header */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="h-9 w-64 rounded-xl animate-shimmer" />
        <div className="h-3 w-40 rounded animate-shimmer" />
      </div>

      {/* 2-column grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
        {/* Main column */}
        <div className="lg:col-span-3 space-y-5">
          {/* Streak widget */}
          <div className="h-20 rounded-2xl animate-shimmer" />
          {/* Section label */}
          <div className="h-3 w-28 rounded animate-shimmer" />
          {/* Verse card */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
            <div className="h-3 w-1/4 rounded animate-shimmer" />
            <div className="h-10 w-full rounded animate-shimmer" />
            <div className="h-3 w-3/4 rounded animate-shimmer" />
            <div className="h-3 w-2/3 rounded animate-shimmer" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick actions */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl animate-shimmer" />
            ))}
          </div>
          {/* Hadith card */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
            <div className="h-3 w-32 rounded animate-shimmer mx-auto" />
            <div className="h-6 w-full rounded animate-shimmer" />
            <div className="h-px w-8 rounded animate-shimmer mx-auto" />
            <div className="h-3 w-full rounded animate-shimmer" />
            <div className="h-3 w-5/6 rounded animate-shimmer" />
            <div className="h-3 w-4/6 rounded animate-shimmer" />
            <div className="flex justify-between pt-2">
              <div className="h-3 w-24 rounded animate-shimmer" />
              <div className="h-3 w-20 rounded animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
