import { useCallback } from "react";
import { useUpdateTableStatus } from "./useTable";
import type { TableStatus } from "@repo/types";

export function useTableStatus(tableId: string | null) {
  const updateStatusMutation = useUpdateTableStatus();

  const updateStatus = useCallback(
    (status: TableStatus) => {
      if (!tableId) return;
      updateStatusMutation.mutate({ id: tableId, status });
    },
    [tableId, updateStatusMutation],
  );

  const markAvailable = useCallback(() => {
    updateStatus("AVAILABLE");
  }, [updateStatus]);

  const markOccupied = useCallback(() => {
    updateStatus("OCCUPIED");
  }, [updateStatus]);

  const markReserved = useCallback(() => {
    updateStatus("RESERVED");
  }, [updateStatus]);

  return {
    updateStatus,
    markAvailable,
    markOccupied,
    markReserved,
    isUpdating: updateStatusMutation.isPending,
    error: updateStatusMutation.error,
  };
}
