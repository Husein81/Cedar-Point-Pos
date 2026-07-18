import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PaymentStatus } from "@repo/types";
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

      // A fully paid bill is view-only — show its invoice instead.
      if (summary.paymentStatus === PaymentStatus.PAID) {
        selectTable(null);
        void navigate({
          to: "/invoices/$orderId",
          params: { orderId: summary.orderId },
        });
        return;
      }

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
