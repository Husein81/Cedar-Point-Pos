import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@repo/ui";
import type { ServerOrderWithPayments } from "@/dto/order.dto";
import type { TableOverview } from "@/dto/tables.dto";
import { useFetchActiveOrdersByTable } from "@/hooks/useTable";
import { useOrderStore } from "@/store/orderStore";
import { useTableUiStore } from "@/store/tableUiStore";
import { getTableDisplayName } from "../config";

export interface OpenTableOrderApi {
  seatTable: (table: TableOverview, guestCount?: number) => void;
  openTableOrder: (table: TableOverview) => Promise<void>;
}

/**
 * Gets the user into a table's order: seat fresh guests in a new order tab,
 * or resume whatever's already there — the latest active order, falling
 * back to the invoice when the only order left is PAID (no longer "active").
 */
export const useOpenTableOrder = (): OpenTableOrderApi => {
  const navigate = useNavigate();
  const { loadOrder, createTabWithTable } = useOrderStore();
  const selectTable = useTableUiStore((s) => s.selectTable);
  const fetchActiveOrders = useFetchActiveOrdersByTable();

  const seatTable = useCallback(
    (table: TableOverview, guestCount?: number) => {
      const displayName = getTableDisplayName(table);
      createTabWithTable(table.id, displayName);
      if (guestCount !== undefined) {
        useOrderStore.getState().setGuestCount(guestCount);
      }
      selectTable(null);
      void navigate({
        to: "/",
        search: { tableId: table.id, tableName: displayName },
      });
    },
    [createTabWithTable, navigate, selectTable],
  );

  const openTableOrder = useCallback(
    async (table: TableOverview) => {
      try {
        const activeOrders = await fetchActiveOrders(table.id);

        if (activeOrders.length > 0) {
          const latest = [...activeOrders].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime(),
          )[0];

          const tabId = loadOrder(latest as unknown as ServerOrderWithPayments);
          if (tabId) {
            selectTable(null);
            void navigate({ to: "/", search: { tableId: table.id } });
          }
          return;
        }

        // A PAID order is no longer "active" — show its invoice instead.
        if (table.activeOrder) {
          selectTable(null);
          void navigate({
            to: "/invoices/$orderId",
            params: { orderId: table.activeOrder.orderId },
          });
          return;
        }

        seatTable(table);
      } catch {
        toast.error("Failed to load the table's order");
      }
    },
    [fetchActiveOrders, loadOrder, navigate, seatTable, selectTable],
  );

  return { seatTable, openTableOrder };
};
