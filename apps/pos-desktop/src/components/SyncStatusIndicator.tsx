import { useSync } from "@/hooks/useSync";
import { useSyncStore } from "@/store/syncStore";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button, Badge } from "@repo/ui";

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, lastSyncTime, stats, error } = useSyncStore();
  const { syncNow, retryFailed } = useSync();

  const formatLastSync = () => {
    if (!lastSyncTime) return "Never";

    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Indicator */}
      <div
        className="flex items-center gap-1"
        title={isOnline ? "Connected to server" : "Working offline"}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-xs text-muted-foreground">
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      {/* Sync Stats */}
      <div className="flex items-center gap-1">
        {stats.pending > 0 && (
          <Badge variant="secondary" className="text-xs">
            {stats.pending} pending
          </Badge>
        )}
        {stats.failed > 0 && (
          <Badge variant="destructive" className="text-xs">
            {stats.failed} failed
          </Badge>
        )}
        {stats.synced > 0 && stats.pending === 0 && stats.failed === 0 && (
          <Badge variant="default" className="text-xs bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        )}
      </div>

      {/* Error Indicator */}
      {error && (
        <div title={error}>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
      )}

      {/* Manual Sync Button */}
      <div title={`Last sync: ${formatLastSync()}`}>
        <Button
          size="sm"
          variant="ghost"
          onClick={syncNow}
          disabled={isSyncing || !isOnline}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Retry Failed Button */}
      {stats.failed > 0 && (
        <Button size="sm" variant="destructive" onClick={retryFailed}>
          Retry Failed
        </Button>
      )}
    </div>
  );
}
