export function RecipeLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 w-3/4 rounded-lg bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-16 w-full rounded-lg bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-32 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-28 rounded bg-muted" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" style={{ width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-6 w-28 rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-12 flex-1 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
