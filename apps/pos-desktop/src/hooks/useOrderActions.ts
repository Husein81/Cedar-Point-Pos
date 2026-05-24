import { type PaymentEntry } from "@/components/orders/PaymentForm";
import type { CreateOrderDto, Order } from "@/dto/order.dto";
import {
  useBatchAddItemsToOrder,
  useCreateOrder,
  useProcessPayment,
  useSendToKitchen,
  useUpdateOrderStatus,
} from "@/hooks/useOrder";
import { useBranch } from "@/hooks/useBranch";
import { printReceipt } from "@/components/receipt/ReceiptPdf";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { extractErrorMessage } from "@/utils/error";
import { toItemDto } from "@/utils/financial";
import { BusinessType, OrderStatus, OrderType } from "@repo/types";
import { useCallback, useRef } from "react";
import { toast } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";

export function useOrderActions() {
  const { closeModal } = useModalStore();
  const { closeKeypad } = useKeypadStore();
  const { user } = useAuthStore();
  const { branchId } = useBranchStore();
  const { data: branch } = useBranch(branchId || "");
  const navigate = useNavigate();

  const getActiveOrder = useOrderStore((s) => s.getActiveOrder);
  const getDiscountAmount = useOrderStore((s) => s.getDiscountAmount);
  const getOrderSubtotal = useOrderStore((s) => s.getOrderSubtotal);
  const getVATAmount = useOrderStore((s) => s.getVATAmount);
  const getUnsentItems = useOrderStore((s) => s.getUnsentItems);
  const clearOrder = useOrderStore((s) => s.clearOrder);
  const closeTab = useOrderStore((s) => s.closeTab);
  const activeTabId = useOrderStore((s) => s.activeTabId);
  const updateOrderId = useOrderStore((s) => s.updateOrderId);
  const updateOrderNumber = useOrderStore((s) => s.updateOrderNumber);
  const markItemsSentToKitchen = useOrderStore((s) => s.markItemsSentToKitchen);
  const setOrderStatus = useOrderStore((s) => s.setOrderStatus);
  const setLastCompletedOrder = useOrderStore((s) => s.setLastCompletedOrder);

  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const sendToKitchen = useSendToKitchen();
  const batchAddItemsToOrder = useBatchAddItemsToOrder();

  const paymentLockRef = useRef(false);

  const withPaymentLock = useCallback(async (fn: () => Promise<void>) => {
    if (paymentLockRef.current) return;
    paymentLockRef.current = true;
    try {
      await fn();
    } finally {
      paymentLockRef.current = false;
    }
  }, []);

  const isLoadedOrder = useCallback(
    (orderOverride?: Order): boolean => {
      const active = orderOverride ?? getActiveOrder();
      if (!active) return false;
      return !active.id.startsWith("order-");
    },
    [getActiveOrder],
  );

  const buildOrderDto = useCallback(
    (orderOverride?: Order): CreateOrderDto | null => {
      const active = orderOverride ?? getActiveOrder();
      if (!active || !branchId || !user?.tenantId) return null;

      const discount = getDiscountAmount();

      let orderType: OrderType;
      if (user.tenant?.businessType === BusinessType.RESTAURANT) {
        orderType = active.type ?? OrderType.DINE_IN;
      } else {
        orderType = OrderType.RETAIL;
      }

      return {
        branchId,
        type: orderType,
        customerId: active.customerId ?? undefined,
        shippingFee: active.shippingFee,
        includeVAT: active.includeVAT,
        ...(orderType === OrderType.DINE_IN && active.tableId
          ? { tableId: active.tableId }
          : {}),
        items: active.items.map(toItemDto),
        ...(discount > 0 && { discount }),
      };
    },
    [
      branchId,
      getActiveOrder,
      getDiscountAmount,
      user?.tenant?.businessType,
      user?.tenantId,
    ],
  );

  const getOrCreateOrderId = useCallback(
    async (
      orderOverride?: Order,
    ): Promise<{ id: string; orderNumber: string } | null> => {
      const active = orderOverride ?? getActiveOrder();
      if (!active) return null;

      if (isLoadedOrder(active)) {
        return { id: active.id, orderNumber: active.orderNumber || "" };
      }

      const dto = buildOrderDto(active);
      if (!dto) return null;

      const created = await createOrder.mutateAsync(dto);
      updateOrderId(created.id);
      if (created.orderNumber) {
        updateOrderNumber(created.orderNumber);
      }
      return { id: created.id, orderNumber: created.orderNumber || "" };
    },
    [
      buildOrderDto,
      createOrder,
      getActiveOrder,
      isLoadedOrder,
      updateOrderId,
      updateOrderNumber,
    ],
  );

  const getTotal = useCallback(() => {
    const subtotal = getOrderSubtotal();
    const discount = getDiscountAmount();
    const vat = getVATAmount();
    const order = getActiveOrder();
    const shippingFee = order?.shippingFee ?? 0;
    return subtotal - discount + shippingFee + vat;
  }, [getActiveOrder, getDiscountAmount, getOrderSubtotal, getVATAmount]);

  const handlePaymentConfirm = useCallback(
    async (
      payments: PaymentEntry[],
      sendToKitchenFirst = false,
      loyalty?: { redeemPoints: number },
    ) => {
      await withPaymentLock(async () => {
        if (payments.length === 0) return;

        // Capture state BEFORE any optimistic mutation
        const active = getActiveOrder();
        if (!active || !branchId || !user?.tenantId) return;

        const remainingTotal = getTotal() - (active.paidAmount ?? 0);
        if (remainingTotal <= 0) return;

        if (active.type === OrderType.DELIVERY && !active.customerId) return;
        if (active.type === OrderType.DELIVERY && !active.customerAddress)
          return;

        // ── Optimistic: clear UI immediately ──
        const tabToClose = activeTabId;

        setLastCompletedOrder({
          order: active,
          orderNumber: active.orderNumber || "PREVIEW",
          tenantName: user.tenant?.name || "Cedar Point",
          branchName: branch?.name || "Main Branch",
          branchAddress: branch?.address || "",
          branchPhone: branch?.phone || "",
          loyaltyApplied:
            loyalty && loyalty.redeemPoints > 0
              ? {
                  points: loyalty.redeemPoints,
                  discount: 0,
                }
              : undefined,
        });

        closeKeypad();
        closeModal();
        if (tabToClose) closeTab(tabToClose);
        clearOrder();

        navigate({ to: "/receipt-preview" });

        // ── Background sync ──
        (async () => {
          try {
            if (
              user.tenant?.businessType === BusinessType.RESTAURANT &&
              !active.type
            ) {
              throw new Error("Order type is required");
            }

            const wasLoadedOrder = isLoadedOrder(active);
            const syncedOrder = await getOrCreateOrderId(active);
            if (!syncedOrder) return;
            const orderId = syncedOrder.id;
            const orderNumber = syncedOrder.orderNumber;

            if (wasLoadedOrder) {
              const unsyncedLocal = active.items
                .filter((i) => !i.sentToKitchen && i.id.startsWith("item-"))
                .map(toItemDto);

              if (unsyncedLocal.length > 0) {
                await batchAddItemsToOrder.mutateAsync({
                  id: orderId,
                  items: unsyncedLocal,
                });
              }
            }

            if (sendToKitchenFirst) {
              const unsentItems = active.items.filter((i) => !i.sentToKitchen);
              if (unsentItems.length > 0) {
                await sendToKitchen.mutateAsync(orderId);
              }
            }

            const updatedOrder = await processPayment.mutateAsync({
              id: orderId,
              payments: payments.map((p) => ({
                amount: p.amount,
                method: p.method,
                currencyCode: p.currencyCode,
                exchangeRate: p.exchangeRate,
              })),
              loyalty,
            });

            // Update store with final official server response details
            const finalOrderNumber =
              updatedOrder.orderNumber || orderNumber || "PREVIEW";
            setLastCompletedOrder({
              order: {
                ...active,
                paidAmount: Number((updatedOrder as any).paidAmount || 0),
                status: updatedOrder.status,
                orderNumber: finalOrderNumber,
              },
              orderNumber: finalOrderNumber,
              tenantName: user.tenant?.name || "Cedar Point",
              branchName: branch?.name || "Main Branch",
              branchAddress: branch?.address || "",
              branchPhone: branch?.phone || "",
              loyaltyApplied:
                loyalty && loyalty.redeemPoints > 0
                  ? {
                      points: loyalty.redeemPoints,
                      discount: Number(updatedOrder.discount || 0),
                    }
                  : undefined,
            });

            try {
              let loyaltyApplied = undefined;
              if (loyalty && loyalty.redeemPoints > 0) {
                loyaltyApplied = {
                  points: loyalty.redeemPoints,
                  discount: Number(updatedOrder.discount || 0),
                };
              }

              await printReceipt({
                order: active,
                tenantName: user.tenant?.name || "Cedar Point",
                branchName: branch?.name || "Main Branch",
                branchAddress: branch?.address || "",
                branchPhone: branch?.phone || "",
                orderNumber: finalOrderNumber,
                loyaltyApplied,
              });
            } catch (printErr) {
              console.error("Auto-print failed:", printErr);
            }
          } catch (error) {
            toast.error(extractErrorMessage(error, "Payment failed"), {
              duration: 8000,
            });
          }
        })();
      });
    },
    [
      activeTabId,
      batchAddItemsToOrder,
      branch,
      branchId,
      clearOrder,
      closeKeypad,
      closeModal,
      closeTab,
      getActiveOrder,
      getOrCreateOrderId,
      getTotal,
      isLoadedOrder,
      processPayment,
      sendToKitchen,
      user?.tenant?.businessType,
      user?.tenantId,
      withPaymentLock,
      navigate,
      setLastCompletedOrder,
    ],
  );

  const handleConfirmWithoutPayment = useCallback(async () => {
    await withPaymentLock(async () => {
      // Capture BEFORE optimistic mutation
      const active = getActiveOrder();
      if (!active || !branchId || !user?.tenantId) return;
      if (!active.items?.length || getTotal() <= 0) return;

      // ── Optimistic: clear UI immediately ──
      clearOrder();
      closeKeypad();
      closeModal();
      if (activeTabId) closeTab(activeTabId);
      toast.info("Confirming order...");

      // ── Background sync ──
      (async () => {
        try {
          const syncedOrder = await getOrCreateOrderId(active);
          if (!syncedOrder) return;
          const orderId = syncedOrder.id;

          await updateOrderStatus.mutateAsync({
            id: orderId,
            status: OrderStatus.PENDING,
          });

          toast.success("Order confirmed");
        } catch (error) {
          toast.error(extractErrorMessage(error, "Confirmation failed"), {
            duration: 8000,
          });
        }
      })();
    });
  }, [
    activeTabId,
    branchId,
    clearOrder,
    closeKeypad,
    closeModal,
    closeTab,
    getActiveOrder,
    getOrCreateOrderId,
    getTotal,
    updateOrderStatus,
    user?.tenantId,
    withPaymentLock,
  ]);

  const handleSendToKitchen = useCallback(async () => {
    // Capture BEFORE any mutation
    const active = getActiveOrder();
    if (!active || !branchId || !user?.tenantId) return;
    if (!active.items?.length) return;

    const unsentItems = active.items.filter((i) => !i.sentToKitchen);
    if (unsentItems.length === 0) {
      toast.success("No new items to send");
      return;
    }

    if (active.type === OrderType.DELIVERY && !active.customerId) return;
    if (active.type === OrderType.DELIVERY && !active.customerAddress) return;

    const unsentCount = unsentItems.length;
    const wasLoadedOrder = isLoadedOrder(active);

    // ── Optimistic: mark sent immediately ──
    markItemsSentToKitchen();
    toast.success(
      `Sending ${unsentCount} item${unsentCount !== 1 ? "s" : ""} to kitchen...`,
    );

    // ── Background sync ──
    (async () => {
      try {
        const syncedOrder = await getOrCreateOrderId(active);
        if (!syncedOrder) return;
        const orderId = syncedOrder.id;

        if (wasLoadedOrder) {
          const unsyncedLocal = unsentItems
            .filter((i) => i.id.startsWith("item-"))
            .map(toItemDto);

          if (unsyncedLocal.length > 0) {
            await batchAddItemsToOrder.mutateAsync({
              id: orderId,
              items: unsyncedLocal,
            });
          }
        }

        const result = await sendToKitchen.mutateAsync(orderId);
        setOrderStatus((result?.status ?? OrderStatus.PENDING) as OrderStatus);
        toast.success(
          `Kitchen confirmed ${unsentCount} item${unsentCount !== 1 ? "s" : ""}`,
        );
      } catch (error) {
        toast.error(extractErrorMessage(error, "Kitchen sync failed"));
      }
    })();
  }, [
    batchAddItemsToOrder,
    branchId,
    getActiveOrder,
    getOrCreateOrderId,
    isLoadedOrder,
    markItemsSentToKitchen,
    sendToKitchen,
    setOrderStatus,
    user?.tenantId,
  ]);

  return {
    handlePaymentConfirm,
    handleConfirmWithoutPayment,
    handleSendToKitchen,

    getUnsentItems,
    getActiveOrder,
    getOrderSubtotal,
    getDiscountAmount,
    getVATAmount,
    getTotal,
  };
}
