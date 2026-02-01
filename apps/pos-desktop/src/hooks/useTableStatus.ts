import { useCallback } from 'react';
import { useUpdateTableStatus } from './useTable';
import type { TableStatus } from '@repo/types';

/**
 * Custom hook to encapsulate table status update logic
 * Provides convenient methods for common status transitions
 * 
 * @param tableId - The ID of the table to update
 * @returns Object with status update methods and loading state
 * 
 * @example
 * const { markAvailable, markOccupied, isUpdating } = useTableStatus(table.id);
 * <Button onClick={markAvailable} disabled={isUpdating}>Mark Available</Button>
 */
export function useTableStatus(tableId: string | null) {
    const updateStatusMutation = useUpdateTableStatus();

    /**
     * Update table to a specific status
     */
    const updateStatus = useCallback((status: TableStatus) => {
        if (!tableId) return;
        updateStatusMutation.mutate({ id: tableId, status });
    }, [tableId, updateStatusMutation]);

    /**
     * Mark table as available
     */
    const markAvailable = useCallback(() => {
        updateStatus('AVAILABLE');
    }, [updateStatus]);

    /**
     * Mark table as occupied
     */
    const markOccupied = useCallback(() => {
        updateStatus('OCCUPIED');
    }, [updateStatus]);

    /**
     * Mark table as reserved
     */
    const markReserved = useCallback(() => {
        updateStatus('RESERVED');
    }, [updateStatus]);

    return {
        /**
         * Update table to any status
         */
        updateStatus,

        /**
         * Convenient methods for specific status changes
         */
        markAvailable,
        markOccupied,
        markReserved,

        /**
         * Whether a status update is in progress
         */
        isUpdating: updateStatusMutation.isPending,

        /**
         * Error from the last update attempt
         */
        error: updateStatusMutation.error,
    };
}
