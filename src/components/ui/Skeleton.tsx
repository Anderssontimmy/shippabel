interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`animate-pulse rounded-lg bg-surface-100 ${className}`} />
);

export const ScanResultsSkeleton = () => (
  <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-10">
      <Skeleton className="h-36 w-36 sm:h-44 sm:w-44 rounded-full" />
      <div className="flex-1 space-y-3 w-full">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-16">
    <div className="flex justify-between mb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);
