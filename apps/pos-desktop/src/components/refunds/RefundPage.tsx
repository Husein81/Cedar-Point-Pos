import { useEffect } from "react";
import { Separator } from "@repo/ui";
import { useRefundStore } from "@/store/refundStore";
import { useBranchStore } from "@/store/branchStore";
import {
  useRefundableOrders,
  useRefundableInfo,
  useOrderRefundHistory,
} from "@/hooks/useRefund";
import { RefundOrdersList } from "./RefundOrdersList";
import { RefundCart } from "./RefundCart";
import { RefundHeader } from "./RefundHeader";

/**
 * RefundPage - Professional POS Refund Station
 *
 * Two-pane layout:
 * - Left: Orders list with search/filter
 * - Right: Refund cart with item-level controls
 *
 * Designed for:
 * - Speed (cashier efficiency)
 * - Safety (prevent over-refunding)
 * - Clarity (visual status indicators)
 */
export const RefundPage = () => {
  const { branchId } = useBranchStore();
  const {
    setOrders,
    ordersCurrentPage,
    ordersPageSize,
    searchQuery,
    filterDateFrom,
    filterDateTo,
    filterStatus,
    selectedOrderId,
    selectOrder,
    setSelectedOrderDetails,
    initializeRefundCart,
    setRefundHistory,
    resetStore,
  } = useRefundStore();

  // Use React Query hooks for data fetching
  const { data: ordersData, refetch: refetchOrders } = useRefundableOrders({
    branchId: branchId || "",
    page: ordersCurrentPage,
    limit: ordersPageSize,
    search: searchQuery || undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    status: filterStatus || undefined,
  });

  const { data: refundableInfo } = useRefundableInfo(selectedOrderId || "");

  const { data: refundHistory } = useOrderRefundHistory(selectedOrderId || "");

  // Update store when orders data changes
  useEffect(() => {
    if (ordersData) {
      setOrders(ordersData.data, ordersData.pagination.totalCount);
    }
  }, [ordersData, setOrders]);

  // Update store when selected order details change
  useEffect(() => {
    if (refundableInfo) {
      setSelectedOrderDetails(refundableInfo);
      initializeRefundCart(refundableInfo.items);
    }
  }, [refundableInfo, setSelectedOrderDetails, initializeRefundCart]);

  // Update store when refund history changes
  useEffect(() => {
    if (refundHistory) {
      setRefundHistory(
        refundHistory.map((h) => ({
          id: h.id,
          refundedAt: h.refundedAt,
          totalAmount: h.totalAmount,
          reason: h.reason,
          itemCount: h.items.length,
        }))
      );
    }
  }, [refundHistory, setRefundHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetStore();
    };
  }, [resetStore]);

  // Handle order selection
  const handleOrderSelect = (orderId: string) => {
    if (orderId === selectedOrderId) return;
    selectOrder(orderId);
  };

  // Refresh after refund
  const handleRefundComplete = () => {
    refetchOrders();
  };

  return (
    <div className="fixed inset-x-0 top-12 bottom-8 flex flex-col  p-0 w-full bg-background">
      {/* Header */}
      <RefundHeader onRefresh={refetchOrders} />

      <Separator />

      {/* Two-Pane Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel - Orders List */}
        <div className="w-105 border-r flex flex-col bg-muted/30">
          <RefundOrdersList
            onOrderSelect={handleOrderSelect}
            selectedOrderId={selectedOrderId}
          />
        </div>

        {/* Right Panel - Refund Cart */}
        <div className="flex-1 flex flex-col min-h-0">
          <RefundCart onRefundComplete={handleRefundComplete} />
        </div>
      </div>
    </div>
  );
};
