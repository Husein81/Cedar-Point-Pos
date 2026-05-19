import { Shad, Skeleton } from "@repo/ui";

export function SkeletonCard() {
  return (
    <Shad.Card className="w-full">
      <Shad.CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-1/3 bg-muted/60" />
          <Skeleton className="h-3 w-1/4 bg-muted/20" />
        </div>
      </Shad.CardHeader>

      <Shad.CardContent className="space-y-4">
        <Skeleton className="h-4 w-5/6 bg-muted/60" />
        <Skeleton className="h-4 w-4/6 bg-muted/60" />
        <Skeleton className="h-4 w-3/6 bg-muted/20" />

        <div className="flex gap-2 pt-2">
          <Skeleton className="h-7 w-full rounded-md bg-muted/60" />
        </div>
      </Shad.CardContent>
    </Shad.Card>
  );
}
