import { useOrderStore } from "@/store/orderStore";
import type { OrderStatus, PaymentMethod } from "@repo/types";
import { Button, cn, Icon } from "@repo/ui";
import { useCallback, useMemo, useState } from "react";
import AlertDialog from "../common/AlertDialog";
import { PaymentForm } from "./PaymentForm";
import { useModalStore } from "@/store/modalStore";
import {
  useCreateOrder,
  useUpdateOrderStatus,
  useProcessPayment,
} from "@/hooks/useOrder";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { usePrinterStore } from "@/store/printerStore";
import { BusinessType, OrderType } from "@repo/types";
import type { CreateOrderDto } from "@/apis/ordersApi";
import { ReceiptPreview } from "../receipts";

type Props = {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
  onConfirmWithoutPayment?: () => void;
};

export const OrderActions = ({
  className,
  onCompleteOrder,
  onHoldOrder,
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
  } = useOrderStore();

  const { user } = useAuthStore();
  const { branchId } = useBranchStore();

  const createOrderMutation = useCreateOrder();
  const updateOrderStatusMutation = useUpdateOrderStatus();
  const processPaymentMutation = useProcessPayment();

  const [isProcessing, setIsProcessing] = useState(false);

  const order = getActiveOrder();
  const total = getOrderTotal();
  const discount = getDiscountAmount();

  const hasItems = !!order?.items?.length;
  const canComplete = hasItems && total > 0;
  const canHold = hasItems && order?.status !== "ON_HOLD";
  const isOnHold = order?.status === "ON_HOLD";

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
      order.type ||
      (user.tenant.businessType === BusinessType.RETAIL
        ? OrderType.RETAIL
        : OrderType.DINE_IN);

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
  }, [branchId, discount, order, user]);

  const getOrCreateBackendOrder = useCallback(async () => {
    if (!order || !branchId || !user?.tenantId) {
      throw new Error("Missing required order data");
    }
    const dto = buildOrderDto();
    return createOrderMutation.mutateAsync(dto);
  }, [branchId, buildOrderDto, createOrderMutation, order, user?.tenantId]);

  const handleApiError = useCallback((error: any, defaultTitle: string) => {
    console.error(defaultTitle, error);
    const errorData = error?.response?.data;
    const errorMessage = errorData?.message || error?.message || defaultTitle;
    alert(`❌ ${defaultTitle}\n\n${errorMessage}`);
  }, []);

  const handlePayConfirm = async (
    method: PaymentMethod,
    amountTendered: number,
    currencyCode?: string,
    exchangeRate?: number
  ) => {
    if (!canComplete || isProcessing) return;
    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();
      await processPaymentMutation.mutateAsync({
        id: createdOrder.id,
        amount: amountTendered,
        method,
        currencyCode,
        exchangeRate,
      });
      await updateOrderStatusMutation.mutateAsync({
        id: createdOrder.id,
        status: "COMPLETED",
      });

      // Show receipt / auto-print
      const { autoPrintOnPayment, silentPrint, defaultPrinter } =
        usePrinterStore.getState();

      if (
        autoPrintOnPayment &&
        silentPrint &&
        defaultPrinter &&
        window.electron?.print
      ) {
        // Silent auto-print: print directly without showing preview
        window.electron
          .print({
            silent: true,
            printerName: defaultPrinter,
            printBackground: true,
          })
          .catch((err) => {
            console.error("Auto-print failed:", err);
          });
      } else if (autoPrintOnPayment) {
        // Show receipt preview for manual printing
        openModal(
          "Receipt",
          <ReceiptPreview
            orderId={createdOrder.id}
            onClose={closeModal}
            onPrintSuccess={() => {
              closeModal();
            }}
          />
        );
      }

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
      setOrderStatus("ON_HOLD");
      onHoldOrder?.();
    } catch (error: any) {
      handleApiError(error, "Failed to hold order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeOrder = () => {
    setOrderStatus("DRAFT");
  };

  const handleConfirmWithoutPaymentConfirm = async () => {
    if (!canComplete || isProcessing) return;
    setIsProcessing(true);
    try {
      const createdOrder = await getOrCreateBackendOrder();
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

  const holdInfoSection = useMemo(
    () => (
      <div className="space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">
          The order will be saved and can be resumed later.
        </p>
      </div>
    ),
    []
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* PAY */}
      <Button
        onClick={handlePay}
        disabled={!canComplete || isProcessing}
        isSubmitting={isProcessing}
        className="flex-1"
      >
        <Icon name="CreditCard" className="w-4 h-4 mr-2" />
        Pay
      </Button>

      {/* HOLD / RESUME */}
      {isOnHold ? (
        <Button
          variant="default"
          className="bg-amber-500 hover:bg-amber-600"
          onClick={handleResumeOrder}
        >
          <Icon name="Play" className="w-4 h-4 mr-1" />
          Resume
        </Button>
      ) : (
        <AlertDialog
          iconButton="CirclePause"
          variant="warning"
          title="Hold Order"
          description="Put this order on hold?"
          section={holdInfoSection}
          confirmText="Hold"
          onConfirm={handleHoldConfirm}
        />
      )}

      {/* CONFIRM ONLY */}
      <AlertDialog
        title="Confirm Without Payment"
        description="Confirm order without payment."
        label="Confirm"
        iconButton="Check"
        onConfirm={handleConfirmWithoutPaymentConfirm}
        variant="warning"
        buttonVariant="outline"
      />
    </div>
  );
};
