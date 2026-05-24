import { toast } from "@repo/ui";
import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/context/NetworkContext";

export function NetworkStatusToast() {
  const { isOnline } = useNetworkStatus();
  const previousStatus = useRef<boolean | null>(null);

  useEffect(() => {
    if (previousStatus.current === null) {
      previousStatus.current = isOnline;
      return;
    }

    if (isOnline && previousStatus.current === false) {
      toast.success("You are back online");
    }

    if (!isOnline && previousStatus.current === true) {
      toast.error(
        "You are offline. Orders will be queued and synced when you reconnect.",
        {
          duration: 6000,
        },
      );
    }

    previousStatus.current = isOnline;
  }, [isOnline]);

  return null;
}
