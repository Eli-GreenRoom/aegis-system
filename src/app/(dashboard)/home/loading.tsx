export default function HomeLoading() {
  return (
    <div className="px-6 py-6 space-y-7 max-w-3xl animate-pulse">
      {/* Festival strip skeleton */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="h-4 w-40 rounded bg-[--color-surface-raised]" />
          <div className="h-10 w-24 rounded bg-[--color-surface-raised]" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-md border border-[--color-border] bg-[--color-surface] p-3 space-y-2"
            >
              <div className="h-2.5 w-16 rounded bg-[--color-surface-raised]" />
              <div className="h-8 w-12 rounded bg-[--color-surface-raised]" />
            </div>
          ))}
        </div>
        <div className="h-1.5 w-full rounded-full bg-[--color-surface-raised]" />
      </div>

      {/* Issue rows skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-[--color-surface-raised]" />
        <div className="space-y-px">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 rounded-md border border-[--color-border] bg-[--color-surface]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
