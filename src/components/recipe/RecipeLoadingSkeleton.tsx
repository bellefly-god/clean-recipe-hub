interface RecipeLoadingSkeletonProps {
  title?: string;
  description?: string;
  progress?: number;
}

export function RecipeLoadingSkeleton({
  title = "Working…",
  description,
  progress,
}: RecipeLoadingSkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-3 rounded-2xl border bg-card/80 p-4 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {typeof progress === "number" && (
            <span className="text-xs text-muted-foreground">{Math.max(0, Math.min(100, Math.round(progress)))}%</span>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {typeof progress === "number" && (
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
            />
          </div>
        )}
      </div>
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-10 w-3/4 rounded-lg bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-16 w-full rounded-lg bg-muted" />
      </div>
      <div className="flex gap-2 animate-pulse">
        <div className="h-8 w-32 rounded-lg bg-muted" />
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>
      <div className="space-y-3 animate-pulse">
        <div className="h-6 w-28 rounded bg-muted" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" style={{ width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-4 animate-pulse">
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
