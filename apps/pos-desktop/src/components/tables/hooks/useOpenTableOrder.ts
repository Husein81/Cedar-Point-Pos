import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OrderStatus } from "@repo/types";
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
      const summary = table.activeOrder;

      if (!summary) {
        seatTable(table);
        return;
      }

      // A PAID order is no longer "active" — show its invoice instead.
      if (summary.status === OrderStatus.PAID) {
        selectTable(null);
        void navigate({
          to: "/invoices/$orderId",
          params: { orderId: summary.orderId },
        });
        return;
      }

      // Navigate straight to the order screen, then hydrate the tab as soon
      // as the order payload arrives (usually already cached by the drawer).
      selectTable(null);
      void navigate({ to: "/", search: { tableId: table.id } });

      try {
        const activeOrders = await fetchActiveOrders(table.id);
        const latest = [...activeOrders].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )[0];

        if (!latest) {
          // The order was closed while the overview was stale — seat fresh.
          seatTable(table);
          return;
        }

        const tabId = loadOrder(latest as unknown as ServerOrderWithPayments);
        if (!tabId) {
          toast.error("Tab limit reached — close a tab to open this order");
        }
      } catch {
        toast.error("Failed to load the table's order");
      }
    },
    [fetchActiveOrders, loadOrder, navigate, seatTable, selectTable],
  );

  return { seatTable, openTableOrder };
};
