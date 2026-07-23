import { Shad, Skeleton } from "@repo/ui";
import { ReactNode } from "react";
import { ErrorState } from "./error-state";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered top-right of the header (filters, toggles, ...) */
  action?: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

export const ChartCard = ({
  title,
  subtitle,
  children,
  action,
  isLoading,
  error,
  onRetry,
}: Props) => {
  return (
    <Shad.Card className="gap-4">
      <Shad.CardHeader>
        <Shad.CardTitle>{title}</Shad.CardTitle>
        {subtitle && <Shad.CardDescription>{subtitle}</Shad.CardDescription>}
        {action && <Shad.CardAction>{action}</Shad.CardAction>}
      </Shad.CardHeader>

      <Shad.CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} />
        ) : (
          children
        )}
      </Shad.CardContent>
    </Shad.Card>
  );
};

const SKELETON_BAR_HEIGHTS = [
  "h-[40%]",
  "h-[70%]",
  "h-[55%]",
  "h-[85%]",
  "h-[60%]",
  "h-[90%]",
  "h-[75%]",
] as const;

const ChartSkeleton = () => (
  <div className="flex h-[300px] flex-col justify-end gap-2">
    <div className="flex flex-1 items-end gap-3">
      {SKELETON_BAR_HEIGHTS.map((height, i) => (
        <Skeleton key={i} className={`flex-1 rounded-md ${height}`} />
      ))}
    </div>
    <Skeleton className="h-3 w-full" />
  </div>
);
