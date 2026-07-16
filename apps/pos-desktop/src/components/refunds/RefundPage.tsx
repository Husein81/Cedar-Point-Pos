import { useEffect } from "react";
import { Separator } from "@repo/ui";
import { useBranchStore } from "@/store/branchStore";
import { useRefundStore } from "@/store/refundStore";
import {
  useOrderRefundHistory,
  useRefundableInfo,
  useRefundableOrders,
} from "@/hooks/useRefund";
import { RefundHeader } from "./RefundHeader";
import { RefundOrdersList } from "./RefundOrdersList";
import { RefundCart } from "./RefundCart";
import { REFUND_ORDERS_PAGE_SIZE } from "./config";

export const RefundPage = () => {
  const { branchId } = useBranchStore();
  const searchQuery = useRefundStore((s) => s.searchQuery);
  const dateFrom = useRefundStore((s) => s.dateFrom);
  const dateTo = useRefundStore((s) => s.dateTo);
  const page = useRefundStore((s) => s.page);
  const selectedOrderId = useRefundStore((s) => s.selectedOrderId);
  const resetStore = useRefundStore((s) => s.resetStore);

  const ordersQuery = useRefundableOrders({
    branchId: branchId || undefined,
    page,
    limit: REFUND_ORDERS_PAGE_SIZE,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const infoQuery = useRefundableInfo(selectedOrderId ?? "");
  const historyQuery = useOrderRefundHistory(selectedOrderId ?? "");

  // Start fresh (filters, selection, draft) whenever the station is closed.
  useEffect(() => resetStore, [resetStore]);

  return (
    <div className="fixed inset-x-0 top-12 bottom-8 flex flex-col w-full bg-background">
      <RefundHeader
        onRefresh={() => ordersQuery.refetch()}
        isRefreshing={ordersQuery.isFetching}
      />

      <Separator />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel — refundable orders */}
        <div className="w-105 border-r flex flex-col bg-muted/30">
          <RefundOrdersList
            orders={ordersQuery.data?.data ?? []}
            totalCount={ordersQuery.data?.pagination.totalCount ?? 0}
            isLoading={ordersQuery.isLoading}
            isError={ordersQuery.isError}
          />
        </div>

        {/* Right panel — refund detail */}
        <div className="flex-1 flex flex-col min-h-0">
          <RefundCart
            info={infoQuery.data}
            isLoading={infoQuery.isLoading}
            isError={infoQuery.isError}
            history={historyQuery.data ?? []}
          />
        </div>
      </div>
    </div>
  );
};
