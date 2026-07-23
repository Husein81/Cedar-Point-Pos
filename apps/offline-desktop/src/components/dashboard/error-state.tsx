import { Button, Icon } from "@repo/ui";

export const ErrorState = ({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) => (
  <div className="flex h-[300px] flex-col items-center justify-center gap-1 text-center">
    <div className="mb-2 rounded-full bg-destructive/10 p-3">
      <Icon name="CircleAlert" className="size-6 text-destructive" />
    </div>
    <p className="text-sm font-medium text-foreground">Failed to load data</p>
    <p className="max-w-xs text-xs text-muted-foreground">{error.message}</p>
    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        iconName="RotateCcw"
        onClick={onRetry}
      >
        Retry
      </Button>
    )}
  </div>
);
