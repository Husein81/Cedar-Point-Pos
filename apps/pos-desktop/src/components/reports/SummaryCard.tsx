import { Icon, Skeleton } from "@repo/ui";

export interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  subtitle?: string;
}

export function SummaryCard({
  title,
  value,
  icon,
  subtitle,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-md bg-primary/10 p-2">
          {<Icon name={icon} className="w-4 h-4 text-primary" />}
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
