import { toast } from "@repo/ui";
import axios from "axios";
import { useEffect, useRef } from "react";

export function NetworkStatusToast() {
  // Prevent duplicate toasts
  const previousStatus = useRef<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkInternetConnection = async (): Promise<boolean> => {
      try {
        const response = await axios.get(
          "https://pointverse-api.vercel.app/test",
          {
            timeout: 5000,
          },
        );

        return response.status === 200;
      } catch {
        return false;
      }
    };

    const checkConnection = async () => {
      if (!navigator.onLine) {
        if (!mounted) return;

        if (previousStatus.current !== false) {
          toast.error("You are offline. Some features may not work.");
        }

        previousStatus.current = false;

        return;
      }

      const online = await checkInternetConnection();

      if (!mounted) return;

      // Show toast only when status changes
      if (online && previousStatus.current === false) {
        toast.success("You are back online");
      }

      if (!online && previousStatus.current !== false) {
        toast.error("You are offline. Some features may not work.");
      }

      previousStatus.current = online;
    };

    checkConnection();

    const interval = setInterval(checkConnection, 5000);

    window.addEventListener("online", checkConnection);

    window.addEventListener("offline", checkConnection);

    return () => {
      mounted = false;

      clearInterval(interval);

      window.removeEventListener("online", checkConnection);

      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  return null;
}
