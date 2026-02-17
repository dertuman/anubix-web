'use client';

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg bg-zinc-900/90">
      <div className="relative aspect-[4/3] w-full animate-pulse bg-slate-800 duration-700" />
      <div className="space-y-3 p-4">
        <div className="h-6 w-3/4 animate-pulse rounded bg-slate-800 duration-700" />
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-6 w-16 animate-pulse rounded-full bg-slate-800 duration-700"
            />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-slate-800 duration-700" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800 duration-700" />
        </div>
      </div>
    </div>
  );
}

export function CardsListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(8)].map((_, i) => (
        <div key={i}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
