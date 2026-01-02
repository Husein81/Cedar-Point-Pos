import { useEffect, useCallback } from "react";
import { useSyncStore } from "../store/syncStore";
import { useAuthStore } from "../store/authStore";

export function useSync() {
  const { setOnline, setSyncing, setLastSyncTime, setStats, setError } =
    useSyncStore();
  const { user } = useAuthStore();

  // Initialize database when user logs in
  useEffect(() => {
    if (!user || !window.electron?.db) return;

    const initDb = async () => {
      try {
        // Get or create device ID
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("deviceId", deviceId);
        }

        // Get or create device token
        let deviceToken = localStorage.getItem("deviceToken");
        if (!deviceToken) {
          deviceToken = crypto.randomUUID();
          localStorage.setItem("deviceToken", deviceToken);
        }

        const result = await window.electron.db.initialize({
          tenantId: user.tenantId || "",
          deviceId,
          deviceToken,
          branchId: "",
        });

        if (!result.success) {
          console.error("Database init failed:", result.error);
          setError(result.error || "Database initialization failed");
        } else {
          console.log("✅ Database initialized");
        }
      } catch (error) {
        console.error("Database init error:", error);
        setError(String(error));
      }
    };

    initDb();
  }, [user, setError]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("📡 Network: Online");
      setOnline(true);
    };

    const handleOffline = () => {
      console.log("📡 Network: Offline");
      setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // Fetch sync stats every 10 seconds
  useEffect(() => {
    if (!window.electron?.sync) return;

    const fetchStats = async () => {
      try {
        const result = await window.electron.sync.getStats();
        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch sync stats:", error);
      }
    };

    fetchStats(); // Initial fetch
    const interval = setInterval(fetchStats, 10000); // Every 10s

    return () => clearInterval(interval);
  }, [setStats]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!window.electron?.sync) {
      setError("Sync service not available");
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const result = await window.electron.sync.syncNow();

      if (result.success) {
        setLastSyncTime(new Date());
        console.log("✅ Manual sync completed");
      } else {
        setError(result.error || "Sync failed");
      }
    } catch (error) {
      console.error("Sync error:", error);
      setError(String(error));
    } finally {
      setSyncing(false);
    }
  }, [setSyncing, setLastSyncTime, setError]);

  // Retry failed syncs
  const retryFailed = useCallback(async () => {
    if (!window.electron?.sync) return;

    setSyncing(true);
    setError(null);

    try {
      const result = await window.electron.sync.retryFailed();

      if (result.success) {
        console.log("✅ Retry completed");
      } else {
        setError(result.error || "Retry failed");
      }
    } catch (error) {
      console.error("Retry error:", error);
      setError(String(error));
    } finally {
      setSyncing(false);
    }
  }, [setSyncing, setError]);

  return {
    syncNow,
    retryFailed,
  };
}
