import { useEffect, useCallback } from "react";
import { useSearch } from "@tanstack/react-router";
import { Button, Icon } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { useModalStore } from "@/store/modalStore";
import { TableSelectorModal } from "./TableSelectorModal";
import type { TableWithFloor } from "@/dto/tables.dto";
import { ordersApi } from "@/apis/ordersApi";

// ============================================================================
// TableSelector Component
// ============================================================================

export function TableSelector() {
    const { openModal } = useModalStore();
    const { getActiveOrder, setTable, loadExistingOrder } = useOrderStore();
    const order = getActiveOrder();

    // Read tableId from URL search params
    const searchParams = useSearch({ from: "/orders/" });

    // Helper to select a table and load its active order if one exists
    const selectTableWithActiveOrderCheck = useCallback(async (tableId: string, tableName: string) => {
        // Set the table first (instant UI feedback)
        setTable(tableId, tableName);
        
        try {
            // Check if the table has an existing active order
            const activeOrder = await ordersApi.getActiveOrderByTableId(tableId);
            
            if (activeOrder) {
                // Table has an active order - load it into the current tab
                console.log("Found active order for table:", activeOrder.id);
                loadExistingOrder(activeOrder as any);
            }
        } catch (error) {
            // If fetch fails, table is already set, just log the error
            console.error("Failed to fetch active order for table:", error);
        }
    }, [setTable, loadExistingOrder]);

    // Initialize table from URL params when navigating from tables page
    useEffect(() => {
        const tableId = searchParams?.tableId;
        const tableName = searchParams?.tableName;

        if (tableId && tableName) {
            selectTableWithActiveOrderCheck(tableId, tableName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount with initial values

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleTableSelect = useCallback((table: TableWithFloor) => {
        // Handle clear action (empty id signals clear)
        if (!table.id) {
            setTable(null, null);
            return;
        }

        const displayName = table.floor
            ? `${table.floor.name} - ${table.name}`
            : table.name;
        
        // Use the helper to check for existing order
        selectTableWithActiveOrderCheck(table.id, displayName);
    }, [setTable, selectTableWithActiveOrderCheck]);

    const handleOpenModal = useCallback(() => {
        openModal(
            "Table Selection",
            <TableSelectorModal
                onTableSelect={handleTableSelect}
                currentTableId={order?.tableId}
            />
        );
    }, [openModal, handleTableSelect, order?.tableId]);

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <Button
            variant={order?.tableId ? "default" : "outline"}
            size="sm"
            onClick={handleOpenModal}
            className="h-7 text-xs gap-1.5"
        >
            <Icon name="Utensils" className="h-3.5 w-3.5" />
            <span className="max-w-24 truncate">
                {order?.tableName || "Select Table"}
            </span>
            <Icon name="ChevronRight" className="h-3 w-3 ml-0.5" />
        </Button>
    );
}
