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
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="rounded-md bg-muted p-2">
          {<Icon name={icon} className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export function SummaryCardSkeleton() {
  return <Skeleton className="h-30 animate-pulse rounded-lg border bg-muted" />;
}
