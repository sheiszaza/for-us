type LoadingSkeletonProps = {
  count?: number;
};

export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-[2rem] bg-white/60 ring-1 ring-rose-100" />
      ))}
    </div>
  );
}
