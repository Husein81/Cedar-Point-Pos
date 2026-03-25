import { api } from "@/apis/api";
import { floorsApi } from "@/apis/floorsApi";
import { tablesApi } from "@/apis/tablesApi";
import { floorService, tableService } from "@/db/service";
import { syncService } from "@/db/sync.service";
import type { FloorDocument, TableDocument } from "@/db/types";
import type {
  CreateFloorDto,
  CreateTableDto,
  UpdateFloorDto,
  UpdateTableDto,
} from "@/dto/tables.dto";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { Subscription } from "rxjs";
import type { TableStatus } from "@repo/types";
import { toast } from "sonner";

type ApiRow = Record<string, unknown>;

type FloorsResponse = {
  floors: FloorDocument[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<void>;
};

type TablesResponse = {
  tables: TableDocument[];
  isLoading: boolean;
  error: unknown | null;
  refetch: () => Promise<void>;
};

const branchSyncInFlight = new Map<string, Promise<void>>();

function requireTenantId(tenantId?: string | null): string {
  if (!tenantId) {
    throw new Error("Tenant is required to manage local floors and tables");
  }

  return tenantId;
}

function requireBranchId(branchId?: string | null): string {
  if (!branchId) {
    throw new Error("Branch is required to manage local floors and tables");
  }

  return branchId;
}

function queueSync(): void {
  syncService.push().catch(console.error);
}

function normalizeStatus(status: unknown): TableStatus {
  if (status === "OCCUPIED" || status === "RESERVED") {
    return status;
  }
  return "AVAILABLE";
}

function mapServerFloor(raw: ApiRow): FloorDocument {
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

function mapServerTable(raw: ApiRow): TableDocument {
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

function normalizeSyncError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return new Error(message);
    }
  }

  return new Error("Failed to sync local table data");
}

async function fetchBranchRowsFromApi(branchId: string): Promise<{
  floorRows: ApiRow[];
  tableRows: ApiRow[];
}> {
  const [floorsResponse, tablesResponse] = await Promise.all([
    api.get<Record<string, unknown>[]>(`/floors/branch/${branchId}`),
    api.get<Record<string, unknown>[]>(`/tables/branch/${branchId}`),
  ]);

  return {
    floorRows: (floorsResponse.data ?? []) as ApiRow[],
    tableRows: (tablesResponse.data ?? []) as ApiRow[],
  };
}

async function doSyncTablesBranch(branchId: string): Promise<void> {
  const { floorRows, tableRows } = await fetchBranchRowsFromApi(branchId);

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

export function useLocalFloors(branchId?: string): FloorsResponse {
  const [floors, setFloors] = useState<FloorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const refetch = useCallback(async () => {
    if (!branchId) return;
    try {
      setError(null);
      await syncBranchTables(branchId);
    } catch (err) {
      setError(normalizeSyncError(err));
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
            setError(normalizeSyncError(err));
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(normalizeSyncError(err));
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
): TablesResponse {
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
      setError(normalizeSyncError(err));
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
            setError(normalizeSyncError(err));
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(normalizeSyncError(err));
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

export function useLocalCreateFloor() {
  const { user } = useAuthStore();
  const { branchId: activeBranchId } = useBranchStore();

  return useMutation<FloorDocument, Error, CreateFloorDto>({
    mutationFn: async (data) => {
      const tenantId = requireTenantId(user?.tenantId);
      const branchId = requireBranchId(data.branchId ?? activeBranchId);
      const doc = await floorService.create({
        tenantId,
        branchId,
        name: data.name.trim(),
        order: data.order ?? 0,
      });

      queueSync();
      return doc;
    },
    onSuccess: (data) => {
      toast.success(`Floor "${data.name}" created `);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create floor  ");
    },
  });
}

export function useLocalUpdateFloor() {
  return useMutation<
    FloorDocument,
    Error,
    { id: string; data: UpdateFloorDto }
  >({
    mutationFn: async ({ id, data }) => {
      const doc = await floorService.update(id, {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
      });

      if (!doc) {
        throw new Error("Floor not found");
      }

      queueSync();
      return doc.toJSON() as FloorDocument;
    },
    onSuccess: (data) => {
      toast.success(`Floor "${data.name}" updated `);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update floor  ");
    },
  });
}

export function useLocalDeleteFloor() {
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const floor = await floorService.ensureDeletable(id);
      if (!floor) {
        return;
      }

      if (!floor.isLocalOnly) {
        await floorsApi.deleteFloor(id);
      }

      await floorService.delete(id);
    },
    onSuccess: () => {
      toast.success("Floor deleted  ");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete floor  ");
    },
  });
}

export function useLocalCreateTable() {
  const { user } = useAuthStore();
  const { branchId: activeBranchId } = useBranchStore();

  return useMutation<TableDocument, Error, CreateTableDto>({
    mutationFn: async (data) => {
      const tenantId = requireTenantId(user?.tenantId);
      const branchId = requireBranchId(data.branchId ?? activeBranchId);
      const normalizedFloorId = data.floorId?.trim() || null;
      const doc = await tableService.create({
        tableNumber: data.tableNumber,
        tenantId,
        branchId,
        floorId: normalizedFloorId,
        name: data.name.trim(),
        capacity: data.capacity ?? 4,
        status: "AVAILABLE",
        isActive: true,
      });

      queueSync();
      return doc;
    },
    onSuccess: (data) => {
      toast.success(`Table "${data.name}" created`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create table  ");
    },
  });
}

export function useLocalUpdateTable() {
  return useMutation<
    TableDocument,
    Error,
    { id: string; data: UpdateTableDto }
  >({
    mutationFn: async ({ id, data }) => {
      const normalizedFloorId =
        data.floorId === undefined
          ? undefined
          : data.floorId?.trim()
            ? data.floorId
            : null;

      const doc = await tableService.update(id, {
        ...(data.tableNumber !== undefined
          ? { tableNumber: data.tableNumber }
          : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.floorId !== undefined ? { floorId: normalizedFloorId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

      if (!doc) {
        throw new Error("Table not found");
      }

      queueSync();
      return doc.toJSON() as TableDocument;
    },
    onSuccess: (data) => {
      toast.success(`Table "${data.name}" updated`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update table  ");
    },
  });
}

export function useLocalUpdateTableStatus() {
  return useMutation<TableDocument, Error, { id: string; status: TableStatus }>(
    {
      mutationFn: async ({ id, status }) => {
        const doc = await tableService.updateStatus(id, status);

        if (!doc) {
          throw new Error("Table not found");
        }

        queueSync();
        return doc.toJSON() as TableDocument;
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update table status");
      },
    },
  );
}

export function useLocalDeleteTable() {
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const table = await tableService.ensureDeletable(id);
      if (!table) {
        return;
      }

      if (!table.isLocalOnly) {
        await tablesApi.deleteTable(id);
      }

      await tableService.delete(id);
    },
    onSuccess: () => {
      toast.success("Table deleted  ");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete table  ");
    },
  });
}
