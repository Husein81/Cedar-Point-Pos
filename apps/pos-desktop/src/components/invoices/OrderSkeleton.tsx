import { Shad, Skeleton } from "@repo/ui";

export function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Back navigation */}
      <Skeleton className="h-4 w-32" />

      {/* Header Skeleton */}
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Quick Info Cards Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Shad.Card key={i}>
            <Shad.CardHeader className="pb-2">
              <Skeleton className="h-3 w-16" />
            </Shad.CardHeader>
            <Shad.CardContent className="pt-0">
              <Skeleton className="h-8 w-24" />
            </Shad.CardContent>
          </Shad.Card>
        ))}
      </div>

      {/* Two Column Layout Skeleton */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <Shad.Card>
            <Shad.CardHeader>
              <Skeleton className="h-5 w-32" />
            </Shad.CardHeader>
            <Shad.CardContent className="p-0">
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-4 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </Shad.CardContent>
          </Shad.Card>

          <Shad.Card>
            <Shad.CardHeader>
              <Skeleton className="h-5 w-40" />
            </Shad.CardHeader>
            <Shad.CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </Shad.CardContent>
          </Shad.Card>
        </div>

        <div className="col-span-2">
          <Shad.Card>
            <Shad.CardHeader>
              <Skeleton className="h-5 w-32" />
            </Shad.CardHeader>
            <Shad.CardContent>
              <Skeleton className="h-32 w-full rounded-md" />
            </Shad.CardContent>
          </Shad.Card>
        </div>
      </div>
    </div>
  );
}
