import { floorService, tableService } from "@/db/local-data.service";
import type { FloorDocument, TableDocument } from "@/db/types";
import { supabase } from "@/lib/supabse";
import { api } from "@/apis/api";
import { useCallback, useEffect, useState } from "react";
import type { Subscription } from "rxjs";
import type { TableStatus } from "@repo/types";

type SupabaseRow = Record<string, unknown>;

interface UseLocalFloorsResult {
  floors: FloorDocument[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<void>;
}

interface UseLocalTablesResult {
  tables: TableDocument[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<void>;
}

const branchSyncInFlight = new Map<string, Promise<void>>();
let canUseSupabaseForTables: boolean | null = null;

type SyncSourceError = Error & {
  status?: number;
  code?: string;
};

function normalizeStatus(status: unknown): TableStatus {
  if (status === "OCCUPIED" || status === "RESERVED") {
    return status;
  }
  return "AVAILABLE";
}

function mapServerFloor(raw: SupabaseRow): FloorDocument {
  const ts = new Date().toISOString();
  return {
    id: String(raw.id ?? ""),
    tenantId: String(raw.tenantId ?? ""),
    branchId: String(raw.branchId ?? ""),
    name: String(raw.name ?? ""),
    order: Number(raw.order ?? 0),
    isDeleted: Boolean(raw.isDeleted ?? false),
    createdAt: (raw.createdAt as string | undefined) ?? ts,
    updatedAt: (raw.updatedAt as string | undefined) ?? ts,
    isSynced: true,
    isLocalOnly: false,
  };
}

function mapServerTable(raw: SupabaseRow): TableDocument {
  const ts = new Date().toISOString();
  const capacity = Number(raw.capacity ?? 4);

  return {
    id: String(raw.id ?? ""),
    tableNumber: Number(raw.tableNumber ?? 0),
    tenantId: String(raw.tenantId ?? ""),
    branchId: String(raw.branchId ?? ""),
    floorId: raw.floorId ? String(raw.floorId) : null,
    name: String(raw.name ?? ""),
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 4,
    status: normalizeStatus(raw.status),
    isActive: Boolean(raw.isActive ?? true),
    isDeleted: Boolean(raw.isDeleted ?? false),
    createdAt: (raw.createdAt as string | undefined) ?? ts,
    updatedAt: (raw.updatedAt as string | undefined) ?? ts,
    isSynced: true,
    isLocalOnly: false,
  };
}

async function fetchBranchRows(
  tableNames: string[],
  select: string,
  branchId: string,
  orderBy: Array<{ column: string; ascending?: boolean }> = [],
): Promise<SupabaseRow[]> {
  let lastError: SyncSourceError | null = null;

  for (const tableName of tableNames) {
    let query: any = supabase
      .from(tableName)
      .select(select)
      .eq("branchId", branchId);
    for (const sort of orderBy) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true });
    }

    const { data, error, status } = await query;
    if (!error) return (data ?? []) as SupabaseRow[];

    const mappedError = new Error(error.message) as SyncSourceError;
    mappedError.status = typeof status === "number" ? status : undefined;
    mappedError.code = error.code ?? undefined;
    lastError = mappedError;

    // Permission/auth issues should not keep trying table-name variants.
    if (status === 401 || status === 403) {
      throw mappedError;
    }
  }

  throw (
    lastError ??
    (new Error(`Failed fetching ${tableNames.join("/")}`) as SyncSourceError)
  );
}

function shouldFallbackToApi(error: unknown): boolean {
  if (error && typeof error === "object") {
    const status = (error as { status?: unknown }).status;
    return status === 401 || status === 403 || status === 404;
  }
  return false;
}

async function fetchBranchRowsFromApi(branchId: string): Promise<{
  floorRows: SupabaseRow[];
  tableRows: SupabaseRow[];
}> {
  const [floorsResponse, tablesResponse] = await Promise.all([
    api.get<Record<string, unknown>[]>(`/floors/branch/${branchId}`),
    api.get<Record<string, unknown>[]>(`/tables/branch/${branchId}`),
  ]);

  return {
    floorRows: (floorsResponse.data ?? []) as SupabaseRow[],
    tableRows: (tablesResponse.data ?? []) as SupabaseRow[],
  };
}

async function doSyncTablesBranch(branchId: string): Promise<void> {
  let floorRows: SupabaseRow[] = [];
  let tableRows: SupabaseRow[] = [];

  if (canUseSupabaseForTables === false) {
    ({ floorRows, tableRows } = await fetchBranchRowsFromApi(branchId));
  } else {
    try {
      [floorRows, tableRows] = await Promise.all([
        fetchBranchRows(
          ["Floor", "floors", "floor"],
          "id,tenantId,branchId,name,order,isDeleted,createdAt,updatedAt",
          branchId,
          [
            { column: "order", ascending: true },
            { column: "name", ascending: true },
          ],
        ),
        fetchBranchRows(
          ["Table", "tables", "table"],
          "id,tableNumber,tenantId,branchId,floorId,name,capacity,status,isActive,isDeleted,createdAt,updatedAt",
          branchId,
          [{ column: "tableNumber", ascending: true }],
        ),
      ]);
      canUseSupabaseForTables = true;
    } catch (error) {
      if (!shouldFallbackToApi(error)) {
        throw error;
      }
      canUseSupabaseForTables = false;
      ({ floorRows, tableRows } = await fetchBranchRowsFromApi(branchId));
    }
  }

  await Promise.all(
    floorRows
      .map(mapServerFloor)
      .filter((floor) => floor.id && floor.branchId)
      .map((floor) => floorService.upsertFromServer(floor)),
  );

  await Promise.all(
    tableRows
      .map(mapServerTable)
      .filter((table) => table.id && table.branchId)
      .map((table) => tableService.upsertFromServer(table)),
  );
}

async function syncBranchTables(branchId: string): Promise<void> {
  const existing = branchSyncInFlight.get(branchId);
  if (existing) {
    await existing;
    return;
  }

  const syncPromise = doSyncTablesBranch(branchId).finally(() => {
    branchSyncInFlight.delete(branchId);
  });

  branchSyncInFlight.set(branchId, syncPromise);
  await syncPromise;
}

export function useLocalFloors(branchId?: string): UseLocalFloorsResult {
  const [floors, setFloors] = useState<FloorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const refetch = useCallback(async () => {
    if (!branchId) return;
    try {
      setError(null);
      await syncBranchTables(branchId);
    } catch (err) {
      setError(err);
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setFloors([]);
      setIsLoading(false);
      return;
    }

    let sub: Subscription | undefined;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const observable = await floorService.findAll$({ branchId });
        if (cancelled) return;

        sub = observable.subscribe({
          next(docs) {
            setFloors(docs.map((d) => d.toJSON() as FloorDocument));
            setIsLoading(false);
          },
          error(err) {
            setError(err);
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [branchId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { floors, isLoading, error, refetch };
}

export function useLocalTables(
  branchId?: string,
  floorId?: string | null,
): UseLocalTablesResult {
  const [tables, setTables] = useState<TableDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const normalizedFloorId = floorId ?? undefined;

  const refetch = useCallback(async () => {
    if (!branchId) return;
    try {
      setError(null);
      await syncBranchTables(branchId);
    } catch (err) {
      setError(err);
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setTables([]);
      setIsLoading(false);
      return;
    }

    let sub: Subscription | undefined;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const observable = await tableService.findAll$({
          branchId,
          ...(normalizedFloorId ? { floorId: normalizedFloorId } : {}),
        });
        if (cancelled) return;

        sub = observable.subscribe({
          next(docs) {
            setTables(docs.map((d) => d.toJSON() as TableDocument));
            setIsLoading(false);
          },
          error(err) {
            setError(err);
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [branchId, normalizedFloorId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { tables, isLoading, error, refetch };
}
