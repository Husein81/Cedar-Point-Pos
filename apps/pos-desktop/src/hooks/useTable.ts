import type {
  ActiveTableOrder,
  CreateTableDto,
  TableLayoutUpdate,
  TableOverview,
  TableWithFloor,
  UpdateTableDto,
} from "@/dto/tables.dto";
import { useBranchStore } from "@/store/branchStore";
import type { TableStatus } from "@repo/types";
import { Table } from "@repo/types";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "@repo/ui";
import { extractErrorMessage } from "@/utils/error";
import { tablesApi } from "../apis/tablesApi";
import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { useNetworkStatus } from "@/context/NetworkContext";

const TABLE_QUERY_KEY = ["tables"] as const;

export const useTablesByBranch = (): UseQueryResult<
  TableWithFloor[],
  Error
> => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "branch", branchId],
    queryFn: () => tablesApi.getTablesByBranch(branchId!),
    staleTime: 60_000,
    enabled: !!branchId,
  });
};

/**
 * Floor-plan overview: all tables + per-table active-order summary in one
 * request. Primary query of the Table Management page; kept fresh by the
 * tables socket (see useTablesSocket) rather than aggressive polling.
 */
export const useTablesOverview = (): UseQueryResult<
  TableOverview[],
  Error
> => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "overview", branchId],
    queryFn: () => tablesApi.getTablesOverview(branchId!),
    staleTime: 15_000,
    enabled: !!branchId,
  });
};

/**
 * Bulk save of floor-plan geometry from the Floor Editor, optimistic on the
 * overview cache so the arrangement doesn't snap back while saving.
 */
export const useUpdateTableLayout = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { updated: number },
    Error,
    TableLayoutUpdate[],
    { previousOverview?: unknown; queryKey: (string | null)[] }
  >({
    mutationFn: (updates) => tablesApi.updateTableLayout(updates),

    onMutate: async (updates) => {
      const branchId = useBranchStore.getState().branchId;
      const queryKey = [...TABLE_QUERY_KEY, "overview", branchId!];
      await queryClient.cancelQueries({ queryKey });

      const previousOverview = queryClient.getQueryData(queryKey);
      const byId = new Map(updates.map((u) => [u.id, u]));

      queryClient.setQueryData(queryKey, (old: TableOverview[] | undefined) => {
        if (!old) return old;
        return old.map((table) => {
          const update = byId.get(table.id);
          return update ? { ...table, ...update } : table;
        });
      });

      return { previousOverview, queryKey };
    },

    onError: (error, _updates, context) => {
      if (context?.previousOverview && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousOverview);
      }
      toast.error(error.message || "Failed to save floor layout");
    },

    onSuccess: () => {
      toast.success("Floor layout saved");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

export const useTablesByFloor = (
  floorId: string | null,
): UseQueryResult<Table[], Error> => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "floor", branchId, floorId],
    queryFn: () => tablesApi.getTablesByFloor(floorId!),
    staleTime: 60_000,
    enabled: !!floorId && !!branchId,
  });
};

export const useTableStats = () => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "stats", branchId],
    queryFn: () => tablesApi.getTableStats(branchId!),
    staleTime: 30_000,
    enabled: !!branchId,
  });
};

/**
 * Get active (non-terminal) orders for a specific table.
 * Used when clicking an occupied table to see what orders are on it.
 */
export const useActiveOrdersByTable = (
  tableId: string | null,
): UseQueryResult<ActiveTableOrder[], Error> => {
  return useQuery<ActiveTableOrder[]>({
    queryKey: [...TABLE_QUERY_KEY, "active-orders", tableId],
    queryFn: () => tablesApi.getActiveOrdersByTable(tableId!),
    staleTime: 30_000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: "offlineFirst",
    enabled: !!tableId,
  });
};

/**
 * Imperative fetch of a table's active orders (context-menu / quick actions
 * need it on demand for tables that aren't the one currently selected).
 * Goes through the query cache so the drawer's query stays warm.
 */
export const useFetchActiveOrdersByTable = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (tableId: string): Promise<ActiveTableOrder[]> =>
      queryClient.fetchQuery({
        queryKey: [...TABLE_QUERY_KEY, "active-orders", tableId],
        queryFn: () => tablesApi.getActiveOrdersByTable(tableId),
        staleTime: 5_000,
      }),
    [queryClient],
  );
};

/**
 * Get a specific table by ID
 */
export const useTable = (id: string) => {
  return useQuery<TableWithFloor>({
    queryKey: [...TABLE_QUERY_KEY, id],
    queryFn: () => tablesApi.getTable(id),
    staleTime: 120_000,
    enabled: !!id,
  });
};

/**
 * Create a new table
 */
export const useCreateTable = (): UseMutationResult<
  TableWithFloor,
  Error,
  CreateTableDto
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tablesApi.createTable,
    onSuccess: (data) => {
      toast.success(`Table "${data.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
    onError: (error: Error) => {
      // Surface the backend's real reason (e.g. "Table number 1 already exists
      // in this branch") — error.message alone is the generic axios status text.
      toast.error(extractErrorMessage(error, "Failed to create table"));
    },
  });
};

/**
 * Update a table with optimistic updates
 */
export const useUpdateTable = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TableWithFloor,
    Error,
    { id: string; data: UpdateTableDto },
    { previousTables?: unknown; queryKey: string[] }
  >({
    mutationFn: ({ id, data }) => tablesApi.updateTable(id, data),

    onMutate: async ({ id, data }) => {
      // Read branchId at mutation time, not at hook call time
      const branchId = useBranchStore.getState().branchId;
      const queryKey = [...TABLE_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousTables = queryClient.getQueryData(queryKey);

      // Optimistic update
      queryClient.setQueryData(
        queryKey,
        (old: TableWithFloor[] | undefined) => {
          if (!old) return old;
          return old.map((table) =>
            table.id === id ? { ...table, ...data } : table,
          );
        },
      );

      return { previousTables, queryKey };
    },

    onError: (error, _variables, context) => {
      // Rollback on error using the same key captured at mutation time
      if (context?.previousTables && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTables);
      }
      toast.error(extractErrorMessage(error, "Failed to update table"));
    },

    onSuccess: (data) => {
      toast.success(`Table "${data.name}" updated successfully`);
    },

    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

/**
 * Update table status with optimistic updates
 */
export const useUpdateTableStatus = () => {
  const queryClient = useQueryClient();
  const { enqueue } = useOfflineQueueStore();
  const { isOnline } = useNetworkStatus();

  return useMutation<
    TableWithFloor,
    Error,
    { id: string; status: TableStatus },
    { previousTables?: unknown; queryKey: string[] }
  >({
    mutationFn: async ({ id, status }) => {
      if (!isOnline) {
        enqueue({
          type: "UPDATE_TABLE_STATUS",
          localId: `offline-table-status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          label: `Update table status to ${status}`,
          payload: { tableId: id, status },
        });
        return { id, status } as any;
      }
      return tablesApi.updateTableStatus(id, { status });
    },

    onMutate: async ({ id, status }) => {
      const branchId = useBranchStore.getState().branchId;
      const queryKey = [...TABLE_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      const previousTables = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(
        queryKey,
        (old: TableWithFloor[] | undefined) => {
          if (!old) return old;
          return old.map((table) =>
            table.id === id ? { ...table, status } : table,
          );
        },
      );

      return { previousTables, queryKey };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousTables && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTables);
      }
      toast.error("Failed to update table status");
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

/**
 * Delete a table (soft delete) with optimistic updates
 */
export const useDeleteTable = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    string,
    { previousTables?: unknown; queryKey: string[] }
  >({
    mutationFn: tablesApi.deleteTable,

    onMutate: async (id) => {
      const branchId = useBranchStore.getState().branchId;
      const queryKey = [...TABLE_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      const previousTables = queryClient.getQueryData(queryKey);

      // Soft-delete: mark isActive:false to match server response instead of
      // removing the row (avoids a visibility flicker on the onSettled refetch)
      queryClient.setQueryData(
        queryKey,
        (old: TableWithFloor[] | undefined) => {
          if (!old) return old;
          return old.map((table) =>
            table.id === id ? { ...table, isActive: false } : table,
          );
        },
      );

      return { previousTables, queryKey };
    },

    onError: (error, _variables, context) => {
      if (context?.previousTables && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTables);
      }
      toast.error(extractErrorMessage(error, "Failed to delete table"));
    },

    onSuccess: () => {
      toast.success("Table deleted successfully");
    },

    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};
