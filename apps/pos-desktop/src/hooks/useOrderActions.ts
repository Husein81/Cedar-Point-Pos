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
import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { useNetworkStatus } from "@/context/NetworkContext";
import { extractErrorMessage } from "@/utils/error";
import { toItemDto } from "@/utils/financial";
import { generateLocalOrderNumber } from "@/utils/order-number";
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
  const { isOnline } = useNetworkStatus();
  const { enqueue } = useOfflineQueueStore();

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

  // ─── handlePaymentConfirm ─────────────────────────────────────────────────

  const handlePaymentConfirm = useCallback(
    async (
      payments: PaymentEntry[],
      sendToKitchenFirst = false,
      loyalty?: { redeemPoints: number },
    ) => {
      await withPaymentLock(async () => {
        if (payments.length === 0) return;

        const active = getActiveOrder();
        if (!active || !branchId || !user?.tenantId) return;

        const remainingTotal = getTotal() - (active.paidAmount ?? 0);
        if (remainingTotal <= 0) return;

        if (active.type === OrderType.DELIVERY && !active.customerId) return;
        if (active.type === OrderType.DELIVERY && !active.customerAddress)
          return;

        // Optimistic: clear UI immediately
        const tabToClose = activeTabId;

        // ── OFFLINE PATH ─────────────────────────────────────────────────────
        if (!isOnline) {
          const dto = buildOrderDto(active);
          if (!dto) return;

          // Generate a local order number in offline mode
          const localOrderNumber = active.orderNumber || (branch ? generateLocalOrderNumber(branch.name) : "DRAFT");

          setLastCompletedOrder({
            order: active,
            orderNumber: localOrderNumber,
            tenantName: user.tenant?.name || "Cedar Point",
            branchName: branch?.name || "Main Branch",
            branchAddress: branch?.address || "",
            branchPhone: branch?.phone || "",
            loyaltyApplied:
              loyalty && loyalty.redeemPoints > 0
                ? { points: loyalty.redeemPoints, discount: 0 }
                : undefined,
          });

          closeKeypad();
          closeModal();
          if (tabToClose) closeTab(tabToClose);
          clearOrder();
          navigate({ to: "/receipt-preview" });

          const label = active.orderNumber
            ? `#${active.orderNumber}`
            : active.tableName
              ? `Table ${active.tableName}`
              : `#${localOrderNumber}`;

          const wasLoaded = isLoadedOrder(active);

          if (wasLoaded) {
            const unsyncedLocal = active.items
              .filter((i) => !i.sentToKitchen && i.id.startsWith("item-"))
              .map(toItemDto);

            enqueue({
              type: "UPDATE_AND_PAY",
              localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              label,
              payload: {
                orderId: active.id,
                newItems: unsyncedLocal.length > 0 ? unsyncedLocal : undefined,
                payments: payments.map((p) => ({
                  amount: p.amount,
                  method: p.method,
                  currencyCode: p.currencyCode,
                  exchangeRate: p.exchangeRate,
                })),
                ...(loyalty ? { loyalty } : {}),
              },
            });
          } else {
            enqueue({
              type: "CREATE_AND_PAY",
              localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              label,
              payload: {
                orderDto: dto,
                payments: payments.map((p) => ({
                  amount: p.amount,
                  method: p.method,
                  currencyCode: p.currencyCode,
                  exchangeRate: p.exchangeRate,
                })),
                ...(loyalty ? { loyalty } : {}),
              },
            });
          }

          toast.info(
            "Order saved offline. It will sync automatically when you reconnect.",
            { duration: 7000 },
          );
          return;
        }

        // ── ONLINE PATH ───────────────────────────────────────────────────────
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
      buildOrderDto,
      clearOrder,
      closeKeypad,
      closeModal,
      closeTab,
      enqueue,
      getActiveOrder,
      getOrCreateOrderId,
      getTotal,
      isLoadedOrder,
      isOnline,
      processPayment,
      sendToKitchen,
      user?.tenant?.businessType,
      user?.tenantId,
      withPaymentLock,
      navigate,
      setLastCompletedOrder,
    ],
  );

  // ─── handleConfirmWithoutPayment ──────────────────────────────────────────

  const handleConfirmWithoutPayment = useCallback(async () => {
    await withPaymentLock(async () => {
      const active = getActiveOrder();
      if (!active || !branchId || !user?.tenantId) return;
      if (!active.items?.length || getTotal() <= 0) return;

      clearOrder();
      closeKeypad();
      closeModal();
      if (activeTabId) closeTab(activeTabId);
      toast.info("Confirming order...");

      // ── OFFLINE PATH ──────────────────────────────────────────────────────
      if (!isOnline) {
        const dto = buildOrderDto(active);
        if (!dto) return;

        const label = active.tableName
          ? `Table ${active.tableName}`
          : `Order (${new Date().toLocaleTimeString()})`;

        const wasLoaded = isLoadedOrder(active);

        if (wasLoaded) {
          enqueue({
            type: "UPDATE_ORDER_STATUS",
            localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label,
            payload: { orderId: active.id, status: OrderStatus.PENDING },
          });
        } else {
          enqueue({
            type: "CREATE_AND_CONFIRM",
            localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label,
            payload: { orderDto: dto },
          });
        }

        toast.info("Order queued offline. Will sync when you reconnect.", {
          duration: 7000,
        });
        return;
      }

      // ── ONLINE PATH ───────────────────────────────────────────────────────
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
    buildOrderDto,
    clearOrder,
    closeKeypad,
    closeModal,
    closeTab,
    enqueue,
    getActiveOrder,
    getOrCreateOrderId,
    getTotal,
    isOnline,
    updateOrderStatus,
    user?.tenantId,
    withPaymentLock,
  ]);

  // ─── handleSendToKitchen ──────────────────────────────────────────────────

  const handleSendToKitchen = useCallback(async () => {
    // When offline, kitchen sync is blocked — the caller must check isOnline first.
    if (!isOnline) {
      toast.error(
        "You are offline. Please connect to the internet to send orders to the kitchen.",
        { duration: 6000 },
      );
      return;
    }

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

    // Optimistic: mark sent immediately
    markItemsSentToKitchen();

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
    isOnline,
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

    /** Exposed so callers can conditionally render UI */
    isOnline,
  };
}
