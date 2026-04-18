/**
 * Discover page loading skeleton — shown while the route segment loads.
 */
export default function DiscoverLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl animate-shimmer" />
        <div className="h-6 w-48 rounded-xl animate-shimmer" />
        <div className="h-3 w-64 rounded animate-shimmer" />
      </div>
      {/* Textarea */}
      <div className="h-28 rounded-xl animate-shimmer" />
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded animate-shimmer" />
        <div className="h-8 w-28 rounded-lg animate-shimmer" />
      </div>
      {/* Example chips */}
      <div className="flex flex-wrap gap-2 mt-4">
        {[120, 100, 140, 90, 110].map((w) => (
          <div key={w} className={`h-7 w-[${w}px] rounded-full animate-shimmer`} style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}
