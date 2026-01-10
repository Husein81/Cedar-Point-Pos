import { useOrderStore } from "@/store/orderStore";
import type { OrderStatus, PaymentMethod } from "@repo/types";
import { Button, cn, Icon } from "@repo/ui";
import { useCallback, useMemo, useState } from "react";
import AlertDialog from "../common/AlertDialog";
import { PaymentForm } from "./PaymentForm";
import { SplitBillForm } from "./SplitBillForm";
import { useModalStore } from "@/store/modalStore";
import {
  useCreateOrder,
  useUpdateOrderStatus,
  useProcessPayment,
  useCompleteSplitPayment,
} from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { BusinessType, OrderType } from "@repo/types";
import type { CreateOrderDto } from "@/apis/ordersApi";

type Props = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onSplitBill?: () => void;
  onConfirmWithoutPayment?: () => void;
};

export const OrderActions = ({
  className,
  onCompleteOrder,
  onHoldOrder,
  onSplitBill,
  onConfirmWithoutPayment,
}: Props) => {
  const { openModal, closeModal } = useModalStore();

  const {
    getActiveOrder,
    getOrderTotal,
    setOrderStatus,
    clearOrder,
    getDiscountAmount,
    closeTab,
    activeTabId,
    // ✅ RECOMMENDED TO ADD IN STORE:
    // getBackendOrderIdForTab,
    // setBackendOrderIdForTab,
  } = useOrderStore();

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const createOrderMutation = useCreateOrder();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const processPaymentMutation = useProcessPayment();
  const completeSplitPaymentMutation = useCompleteSplitPayment();

  const [isProcessing, setIsProcessing] = useState(false);

  const order = getActiveOrder();
  const total = getOrderTotal();
  const discount = getDiscountAmount();

  const hasItems = !!order?.items?.length;

  const canComplete = hasItems && total > 0;
  const canHold = hasItems && order?.status !== "ON_HOLD";
  const canSplitBill = hasItems && total > 0;
  const isOnHold = order?.status === "ON_HOLD";

  // Centralized success cleanup (less re-render churn + less duplication)
  const finalizeSuccess = useCallback(
    (nextLocalStatus: "PAID" | "COMPLETED" | "ON_HOLD" | "PENDING") => {
      setOrderStatus(nextLocalStatus as OrderStatus);
      clearOrder();
      closeModal();

      if (activeTabId) closeTab(activeTabId);
    },
    [activeTabId, clearOrder, closeModal, closeTab, setOrderStatus]
  );

  const buildOrderDto = useCallback((): CreateOrderDto => {
    if (!order || !branchId) throw new Error("Missing required order data");

    if (!user || !user.tenant) throw new Error("User not authenticated");
    const type =
      user.tenant.businessType === BusinessType.RETAIL ? "RETAIL" : "DINE_IN";

    return {
      branchId,
      type,
      customerId: order.customerId || undefined,
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      })),
      discount: discount > 0 ? discount : undefined,
    };
  }, [branchId, discount, order]);

  /**
   * ✅ IMPORTANT: Prevent duplicate orders.
   * You should store backendOrderId per tab once created (especially on HOLD).
   *
   * PSEUDO:
   * const existingId = getBackendOrderIdForTab(activeTabId)
   * if (existingId) return { id: existingId }
   * else create + setBackendOrderIdForTab(activeTabId, created.id)
   */
  const getOrCreateBackendOrder = useCallback(async () => {
    if (!order || !branchId || !user?.tenantId) {
      throw new Error("Missing required order data");
    }

    // ✅ If you already created an order for this tab (e.g. ON_HOLD), reuse it.
    // const existingId = activeTabId ? getBackendOrderIdForTab(activeTabId) : null;
    // if (existingId) return { id: existingId };

    const dto = buildOrderDto();
    console.log("Creating order with DTO:", dto.type);
    const created = await createOrderMutation.mutateAsync(dto);

    // ✅ Save for later so Pay doesn’t create a second order
    // if (activeTabId) setBackendOrderIdForTab(activeTabId, created.id);

    return created;
  }, [
    activeTabId,
    branchId,
    buildOrderDto,
    createOrderMutation,
    order,
    user?.tenantId,
  ]);

  const handleApiError = useCallback((error: any, defaultTitle: string) => {
    console.error(defaultTitle, error);

    const errorData = error?.response?.data;
    const errorMessage = errorData?.message || error?.message || defaultTitle;

    const insufficientStock = errorData?.insufficientStock;
    if (insufficientStock?.length) {
      const stockDetails = insufficientStock
        .map(
          (item: any) =>
            `• ${item.productName || item.ingredientName}: Need ${item.required}, Available ${item.available}`
        )
        .join("\n");

      alert(
        `⚠️ Insufficient Stock\n\n${stockDetails}\n\nPlease adjust quantities or remove items.`
      );
      return;
    }

    alert(`❌ ${defaultTitle}\n\n${errorMessage}`);
  }, []);

  const handlePayConfirm = async (
    method: PaymentMethod,
    amountTendered: number
  ) => {
    if (!canComplete || isProcessing) return;

    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();

      // Process payment - this handles DRAFT → PAID transition and inventory deduction
      await processPaymentMutation.mutateAsync({
        id: createdOrder.id,
        amount: amountTendered,
        method,
      });

      // Move to COMPLETED
      await updateOrderStatusMutation.mutateAsync({
        id: createdOrder.id,
        status: "COMPLETED",
      });

      // Clear the cart
      clearOrder();
      onCompleteOrder?.();
    } catch (error: any) {
      handleApiError(error, "Payment Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldConfirm = async () => {
    if (!canHold || isProcessing) return;

    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();

      await updateOrderStatusMutation.mutateAsync({
        id: createdOrder.id,
        status: "ON_HOLD",
      });

      // ✅ local hold
      setOrderStatus("ON_HOLD");
      onHoldOrder?.();
    } catch (error: any) {
      handleApiError(error, "Failed to hold order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeOrder = () => {
    // ⚠️ If ON_HOLD was persisted to backend, you should also update backend status here
    // if (backendOrderId) update status back to DRAFT/CONFIRMED depending on flow
    setOrderStatus("DRAFT");
  };

  const handleSplitBillConfirm = async (
    splits: Array<{ amount: number; method: PaymentMethod }>
  ) => {
    if (!canComplete || isProcessing) return;

    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();

      // Split payment handles DRAFT → PAID and inventory deduction
      await completeSplitPaymentMutation.mutateAsync({
        id: createdOrder.id,
        payments: splits,
      });

      // Move to COMPLETED
      await updateOrderStatusMutation.mutateAsync({
        id: createdOrder.id,
        status: "COMPLETED",
      });

      finalizeSuccess("PAID");
      onSplitBill?.();
    } catch (error: any) {
      handleApiError(error, "Split Payment Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmWithoutPaymentConfirm = async () => {
    if (!canComplete || isProcessing) return;

    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();

      // For retail: order without payment stays in PENDING
      // User can pay later
      await updateOrderStatusMutation.mutateAsync({
        id: createdOrder.id,
        status: "PENDING",
      });

      finalizeSuccess("PENDING" as any);
      onConfirmWithoutPayment?.();
    } catch (error: any) {
      handleApiError(error, "Order Confirmation Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePay = () => {
    openModal(
      "Payment Form",
      <PaymentForm total={total} onConfirm={handlePayConfirm} />
    );
  };
  const handleSplitBill = () => {
    openModal(
      "Split Bill",
      <SplitBillForm total={total} onConfirm={handleSplitBillConfirm} />
    );
  };
  // Memoize heavy JSX section so it doesn't re-create each render
  const holdInfoSection = useMemo(
    () => (
      <div className="space-y-4 pt-2">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex gap-3">
            <Icon
              name="Info"
              className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
            />
            <div className="space-y-2 text-sm">
              <p className="font-medium">
                What happens when you hold an order:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>The order will be saved and moved to a held state</li>
                <li>You can resume it anytime from the order tabs</li>
                <li>All items and discounts will be preserved</li>
                <li>
                  The held order tab will show a{" "}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                    Hold
                  </span>{" "}
                  badge
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Primary Actions */}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-3 relative"
          onClick={handlePay}
          disabled={!canComplete || isProcessing}
          isSubmitting={isProcessing}
        >
          <Icon name="CreditCard" className="w-4 h-4" />
          Pay
        </Button>

        {isOnHold ? (
          <Button
            variant="default"
            size="lg"
            className="bg-amber-500 hover:bg-amber-600"
            onClick={handleResumeOrder}
          >
            <Icon name="Play" className="w-4 h-4" />
          </Button>
        ) : (
          <AlertDialog
            iconButton="CirclePause"
            size="lg"
            variant="warning"
            title="Hold Order"
            description="Are you sure you want to put this order on hold? You can resume it later."
            section={holdInfoSection}
            confirmText="Hold Order"
            onConfirm={handleHoldConfirm}
          />
        )}
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="default"
          className="flex-1"
          onClick={handleSplitBill}
          disabled={!canSplitBill || isProcessing}
        >
          <Icon name="Split" className="w-4 h-4" />
          Split Bill
        </Button>

        <AlertDialog
          title="Confirm Without Payment"
          description="This will confirm the order without recording payment. Use for comps, staff meals, or manual payment."
          label="Confirm Only"
          iconButton="Check"
          onConfirm={handleConfirmWithoutPaymentConfirm}
          variant="warning"
          buttonVariant="ghost"
        />
      </div>
    </div>
  );
};
