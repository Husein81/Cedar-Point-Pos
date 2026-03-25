import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getDatabase } from "@/db/database";
import { syncService } from "@/db/sync.service";
import { useBranchStore } from "@/store/branchStore";
import { useAuthStore } from "@/store/authStore";
import type { PosDatabase } from "@/db/types";

type DatabaseContextValue = {
  db: PosDatabase | null;
  isReady: boolean;
  isSyncing: boolean;
  syncError: unknown | null;
  triggerSync: () => Promise<void>;
};

type DatabaseProviderProps = {
  children: ReactNode;
  branchId?: string | null;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function DatabaseProvider({
  children,
  branchId: branchIdProp,
}: DatabaseProviderProps) {
  const { branchId: storeBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const branchId = branchIdProp ?? storeBranchId;
  const tenantId = user?.tenantId;
  const [db, setDb] = useState<PosDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<unknown | null>(null);
  const stopSyncRef = useRef<(() => void) | null>(null);

  // Initialise database once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const instance = await getDatabase();
        if (cancelled) return;
        setDb(instance);
        setIsReady(true);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error("[DatabaseProvider] Failed to initialize RxDB:", error);
        if (!cancelled) setSyncError(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initial sync + auto-sync whenever db is ready or branchId/tenantId changes
  useEffect(() => {
    if (!isReady || !tenantId) return;

    const opts = { tenantId, branchId: branchId ?? undefined };

    setIsSyncing(true);
    setSyncError(null);

    syncService
      .initialSync(opts)
      .then((result) => {
        if (!result.success && result.error !== "offline") {
          setSyncError(result.error);
        }
      })
      .catch(setSyncError)
      .finally(() => setIsSyncing(false));

    // Start background auto-sync
    stopSyncRef.current = syncService.startAutoSync(opts);

    return () => {
      stopSyncRef.current?.();
      stopSyncRef.current = null;
    };
  }, [isReady, tenantId, branchId]);

  const triggerSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncService.pull({ branchId: branchId ?? undefined });
      await syncService.push();
    } catch (err) {
      setSyncError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <DatabaseContext.Provider
      value={{ db, isReady, isSyncing, syncError, triggerSync }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

// ─── Consumer Hook ────────────────────────────────────────────────────────────

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error(
      "useDatabaseContext must be used inside <DatabaseProvider>",
    );
  }
  return ctx;
}
