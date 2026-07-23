import { Icon, Skeleton } from "@repo/ui";

export type SummaryCardProps = {
  title: string;
  value: string;
  icon: string;
  subtitle?: string;
};

export function SummaryCard({ title, value, icon, subtitle }: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-md bg-primary/10 p-2">
          <Icon name={icon} className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export function SummaryCardSkeleton() {
  return <Skeleton className="h-30 animate-pulse rounded-lg border bg-muted" />;
}

type SummaryGridProps = {
  items: SummaryCardProps[];
  isLoading?: boolean;
  count?: number;
  columns?: "2" | "3" | "4";
};

const GRID_CLASSES: Record<NonNullable<SummaryGridProps["columns"]>, string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-2 lg:grid-cols-4",
};

export function SummaryGrid({
  items,
  isLoading,
  count = 4,
  columns = "4",
}: SummaryGridProps) {
  if (isLoading) {
    return (
      <div className={`grid gap-4 ${GRID_CLASSES[columns]}`}>
        {Array.from({ length: count }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${GRID_CLASSES[columns]}`}>
      {items.map((item, i) => (
        <SummaryCard key={i} {...item} />
      ))}
    </div>
  );
}
