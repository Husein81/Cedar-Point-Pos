import { useNetworkStatus } from "@/context/NetworkContext";
import { Icon } from "@repo/ui";
import { useState } from "react";

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [toggle, setToggle] = useState(false);

  return (
    <div className="pt-10 -mb-10">
      {!isOnline && !toggle && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400">
          <div className="flex iemts-center w-full gap-2">
            <Icon name="WifiOff" className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium">
              You are offline — orders will be queued and synced when you
              reconnect. Cash payments only.
            </span>
          </div>
          <Icon name="X" className="size-4" onClick={() => setToggle(true)} />
        </div>
      )}
    </div>
  );
}
