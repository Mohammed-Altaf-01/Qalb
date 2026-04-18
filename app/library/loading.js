/**
 * Library page loading skeleton.
 */
export default function LibraryLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <div className="h-6 w-28 rounded-lg animate-shimmer" />
          <div className="h-3 w-40 rounded animate-shimmer" />
        </div>
      </div>
      {/* Tab switcher */}
      <div className="h-10 rounded-xl animate-shimmer mb-6" />
      {/* Bookmark rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 py-3 border-b border-border/30">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-full rounded animate-shimmer" />
            <div className="h-3 w-3/4 rounded animate-shimmer" />
            <div className="h-4 w-20 rounded-full animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
