import { Skeleton } from "@repo/ui";

export function DetailsSkeleton() {
  return (
    <div className="space-y-4 container mt-14">
      {/* Heading Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-muted/60" />
          <Skeleton className="h-4 w-96 bg-muted/60" />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 bg-muted/60" />
          <Skeleton className="h-4 w-24 bg-muted/60" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
