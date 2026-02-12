import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tablesApi } from "../apis/tablesApi";
import { useBranchStore } from "@/store/branchStore";
import type {
  CreateTableDto,
  UpdateTableDto,
  TableWithFloor,
} from "@/dto/tables.dto";
import type { Order, TableStatus } from "@repo/types";

const TABLE_QUERY_KEY = ["tables"];

/**
 * Get all tables for the current branch
 */
export const useTablesByBranch = () => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "branch", branchId],
    queryFn: () => tablesApi.getTablesByBranch(branchId!),
    staleTime: 60_000,
    enabled: !!branchId,
  });
};

/**
 * Get all tables for a specific floor
 */
export const useTablesByFloor = (floorId: string | null) => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...TABLE_QUERY_KEY, "floor", floorId],
    queryFn: () => tablesApi.getTablesByFloor(floorId!),
    staleTime: 60_000,
    enabled: !!floorId && !!branchId,
  });
};

/**
 * Get table statistics for the current branch
 */
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
export const useActiveOrdersByTable = (tableId: string | null) => {
  return useQuery<Order[]>({
    queryKey: [...TABLE_QUERY_KEY, "active-orders", tableId],
    queryFn: () => tablesApi.getActiveOrdersByTable(tableId!),
    staleTime: 30_000,
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
export const useCreateTable = () => {
  const queryClient = useQueryClient();

  return useMutation<TableWithFloor, Error, CreateTableDto>({
    mutationFn: tablesApi.createTable,
    onSuccess: (data) => {
      toast.success(`Table "${data.name}" created successfully`);
      // Invalidate all table queries
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to create table";
      console.error("Table creation error:", error.response?.data || error);
      toast.error(message);
    },
  });
};

/**
 * Update a table with optimistic updates
 */
export const useUpdateTable = () => {
  const queryClient = useQueryClient();
  const { branchId } = useBranchStore();

  return useMutation<
    TableWithFloor,
    Error,
    { id: string; data: UpdateTableDto },
    { previousTables?: unknown }
  >({
    mutationFn: ({ id, data }) => tablesApi.updateTable(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
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

      return { previousTables };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTables) {
        queryClient.setQueryData(
          [...TABLE_QUERY_KEY, "branch", branchId!],
          context.previousTables,
        );
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
  const { branchId } = useBranchStore();

  return useMutation<
    TableWithFloor,
    Error,
    { id: string; status: TableStatus },
    { previousTables?: unknown }
  >({
    mutationFn: ({ id, status }) => tablesApi.updateTableStatus(id, { status }),

    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
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
            table.id === id ? { ...table, status } : table,
          );
        },
      );

      return { previousTables };
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
  const { branchId } = useBranchStore();

  return useMutation<void, Error, string, { previousTables?: unknown }>({
    mutationFn: tablesApi.deleteTable,

    onMutate: async (id) => {
      // Cancel outgoing refetches
      const queryKey = [...TABLE_QUERY_KEY, "branch", branchId!];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousTables = queryClient.getQueryData(queryKey);

      // Optimistic update - remove table from list
      queryClient.setQueryData(
        queryKey,
        (old: TableWithFloor[] | undefined) => {
          if (!old) return old;
          return old.filter((table) => table.id !== id);
        },
      );

      return { previousTables };
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTables) {
        queryClient.setQueryData(
          [...TABLE_QUERY_KEY, "branch", branchId!],
          context.previousTables,
        );
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
