export default function ReadLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-6">
      <div className="mb-8 text-center space-y-2">
        <div className="h-6 w-48 bg-muted/40 rounded-lg mx-auto animate-pulse" />
        <div className="h-4 w-64 bg-muted/30 rounded-lg mx-auto animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
