import type {
  CreateTableDto,
  TableWithFloor,
  UpdateTableDto,
} from "@/dto/tables.dto";
import { useBranchStore } from "@/store/branchStore";
import type { Order, TableStatus } from "@repo/types";
import { Table } from "@repo/types";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { tablesApi } from "../apis/tablesApi";

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
): UseQueryResult<Order[], Error> => {
  return useQuery<Order[]>({
    queryKey: [...TABLE_QUERY_KEY, "active-orders", tableId],
    queryFn: () => tablesApi.getActiveOrdersByTable(tableId!),
    staleTime: 30_000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: "offlineFirst",
    enabled: !!tableId,
  });
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
      const message = error.message ?? "Failed to create table";
      console.error("Table creation error:", error.message || error);
      toast.error(message);
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
      const message = error.message || "Failed to update table";
      toast.error(message);
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

  return useMutation<
    TableWithFloor,
    Error,
    { id: string; status: TableStatus },
    { previousTables?: unknown; queryKey: string[] }
  >({
    mutationFn: ({ id, status }) => tablesApi.updateTableStatus(id, { status }),

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
      const message = error.message || "Failed to delete table";
      toast.error(message);
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
