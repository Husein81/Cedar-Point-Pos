import { cn, Shad, Skeleton } from "@repo/ui";

export function TableSkeleton() {
  const columns = Array.from({ length: 8 });
  const rows = Array.from({ length: 10 });

  return (
    <div className="w-full rounded-md border">
      <Shad.Table>
        <Shad.TableHeader>
          <Shad.TableRow>
            {columns.map((_, i) => (
              <Shad.TableHead key={i} className="py-3">
                <Skeleton className="h-4 w-24 bg-primary/45" />
              </Shad.TableHead>
            ))}
          </Shad.TableRow>
        </Shad.TableHeader>
        <Shad.TableBody>
          {rows.map((_, r) => (
            <Shad.TableRow key={r}>
              {columns.map((_, c) => (
                <Shad.TableCell key={c} className="py-3">
                  <Skeleton
                    className={cn(
                      "h-4  bg-primary/45",
                      c === 0 && "w-28",
                      c === 1 && "w-24",
                      c === 2 && "w-20",
                      c === 3 && "w-32",
                      c === 4 && "w-16",
                      c === 5 && "w-24",
                      c === 6 && "w-20",
                      c === 7 && "w-12"
                    )}
                  />
                </Shad.TableCell>
              ))}
            </Shad.TableRow>
          ))}
        </Shad.TableBody>
      </Shad.Table>
    </div>
  );
}
