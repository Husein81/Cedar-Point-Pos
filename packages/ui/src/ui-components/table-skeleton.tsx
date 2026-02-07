import { cn } from "../libs/utils";
import { Shad, Skeleton } from "../components";

export function TableSkeleton({
  withToolbar = true,
}: {
  withToolbar?: boolean;
}) {
  // 8 rows for "Calm" density
  const rows = Array.from({ length: 8 });

  return (
    <div className="w-full space-y-6">
      {/* Header & Toolbar Skeleton:
          Visually replicates the search bar and action buttons. 
          Rendered here to provide a complete page structure during initial load. 
      */}
      {withToolbar && (
        <div className="flex items-center justify-between px-1">
          {/* Search Input Placeholder */}
          <Skeleton className="h-10 w-[280px] rounded-lg bg-muted/60" />

          {/* Action Buttons Placeholder */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-lg bg-muted/60" />
            <Skeleton className="h-10 w-32 rounded-lg bg-primary/10" />
          </div>
        </div>
      )}

      {/* Main Table Skeleton */}
      <div className="rounded-xl border border-border/40 overflow-hidden shadow-sm">
        <Shad.Table>
          {/* Table Header */}
          <Shad.TableHeader className="bg-muted/20">
            <Shad.TableRow className="hover:bg-transparent border-b border-border/60">
              <Shad.TableHead className="w-[50px] pl-4 py-4">
                <Skeleton className="h-4 w-4 bg-muted/70 rounded-sm" />
              </Shad.TableHead>
              {/* Generalized Column Headers */}
              <Shad.TableHead className="py-4">
                <Skeleton className="h-4 w-32 bg-muted/70 rounded-md" />
              </Shad.TableHead>
              <Shad.TableHead className="py-4">
                <Skeleton className="h-4 w-24 bg-muted/70 rounded-md" />
              </Shad.TableHead>
              <Shad.TableHead className="py-4">
                <Skeleton className="h-4 w-40 bg-muted/70 rounded-md" />
              </Shad.TableHead>
              <Shad.TableHead className="hidden md:table-cell py-4">
                <Skeleton className="h-4 w-48 bg-muted/70 rounded-md" />
              </Shad.TableHead>
              <Shad.TableHead className="w-[100px] py-4 text-right pr-6">
                <Skeleton className="ml-auto h-4 w-12 bg-muted/70 rounded-md" />
              </Shad.TableHead>
            </Shad.TableRow>
          </Shad.TableHeader>

          {/* Table Body */}
          <Shad.TableBody>
            {rows.map((_, i) => (
              <Shad.TableRow
                key={i}
                className="hover:bg-transparent border-b border-border/30 last:border-0"
              >
                {/* Select Checkbox */}
                <Shad.TableCell className="pl-4 py-4">
                  <Skeleton className="h-4 w-4 rounded-sm bg-muted/40" />
                </Shad.TableCell>

                {/* Primary Column (Name) - Varied widths */}
                <Shad.TableCell className="py-4">
                  <Skeleton
                    className={cn(
                      "h-5 rounded-md bg-muted/60",
                      i % 3 === 0
                        ? "w-[140px]"
                        : i % 3 === 1
                          ? "w-[180px]"
                          : "w-[120px]",
                    )}
                  />
                  {/* Subtext line for breathing/detail */}
                  <Skeleton className="h-3 w-20 mt-2 rounded-sm bg-muted/30" />
                </Shad.TableCell>

                {/* Secondary Column (Phone) */}
                <Shad.TableCell className="py-4">
                  <Skeleton className="h-4 w-[110px] rounded-md bg-muted/50" />
                </Shad.TableCell>

                {/* Tertiary Column (Email) */}
                <Shad.TableCell className="py-4">
                  <Skeleton
                    className={cn(
                      "h-4 rounded-md bg-muted/50",
                      i % 2 === 0 ? "w-[200px]" : "w-[160px]",
                    )}
                  />
                </Shad.TableCell>

                {/* Quaternary (Address) */}
                <Shad.TableCell className="hidden md:table-cell py-4">
                  <Skeleton className="h-4 w-[240px] rounded-md bg-muted/40" />
                </Shad.TableCell>

                {/* Actions */}
                <Shad.TableCell className="py-4 pr-6">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md bg-muted/30" />
                    <Skeleton className="h-8 w-8 rounded-md bg-muted/30" />
                  </div>
                </Shad.TableCell>
              </Shad.TableRow>
            ))}
          </Shad.TableBody>
        </Shad.Table>
      </div>
    </div>
  );
}
