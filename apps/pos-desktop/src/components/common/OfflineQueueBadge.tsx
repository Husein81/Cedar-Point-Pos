import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { useModalStore } from "@/store/modalStore";
import { Button, Icon } from "@repo/ui";
import { cn } from "@repo/ui";

function QueueModal() {
  const { queue, clearFailed } = useOfflineQueueStore();
  const failed = queue.filter((op) => op.status === "FAILED");
  const pending = queue.filter(
    (op) => op.status === "PENDING" || op.status === "SYNCING",
  );

  return (
    <div className="flex flex-col gap-4 px-1">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pending Sync ({pending.length})
          </p>
          {pending.map((op) => (
            <div
              key={op.localId}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <Icon
                name={op.status === "SYNCING" ? "RefreshCw" : "Clock"}
                className={cn(
                  "w-4 h-4 shrink-0",
                  op.status === "SYNCING"
                    ? "text-blue-500 animate-spin"
                    : "text-amber-500",
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{op.label}</p>
                <p className="text-xs text-muted-foreground">
                  {op.type === "CREATE_AND_PAY"
                    ? "Payment pending"
                    : "Confirmation pending"}{" "}
                  · Attempt {op.retries + 1}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
              Failed — Manual Review ({failed.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={clearFailed}
            >
              Clear all
            </Button>
          </div>
          {failed.map((op) => (
            <div
              key={op.localId}
              className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <Icon
                name="AlertTriangle"
                className="w-4 h-4 shrink-0 text-destructive"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{op.label}</p>
                <p className="text-xs text-destructive/80">
                  Failed after 3 attempts · Created{" "}
                  {new Date(op.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            These orders were not synced. Please recreate them manually or
            contact support.
          </p>
        </div>
      )}

      {pending.length === 0 && failed.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Icon name="CheckCircle2" className="w-8 h-8 text-green-500" />
          <p className="text-sm">All orders are synced.</p>
        </div>
      )}
    </div>
  );
}

export function OfflineQueueBadge() {
  const { queue, isSyncing } = useOfflineQueueStore();
  const { openModal } = useModalStore();

  const pending = queue.filter(
    (op) => op.status === "PENDING" || op.status === "SYNCING",
  ).length;
  const failed = queue.filter((op) => op.status === "FAILED").length;
  const total = pending + failed;

  if (total === 0 && !isSyncing) return null;

  const hasFailed = failed > 0;

  return (
    <button
      onClick={() =>
        openModal("Offline Queue", <QueueModal />, "Orders waiting to sync")
      }
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
        hasFailed
          ? "bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/25"
          : isSyncing
            ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25"
            : "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25",
      )}
    >
      <Icon
        name={
          hasFailed ? "AlertTriangle" : isSyncing ? "RefreshCw" : "CloudOff"
        }
        className={cn("w-3 h-3", isSyncing && "animate-spin")}
      />
      {isSyncing ? "Syncing…" : `${total} queued`}
    </button>
  );
}
