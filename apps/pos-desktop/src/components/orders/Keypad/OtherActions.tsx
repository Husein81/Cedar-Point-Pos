import type { ServerOrderWithPayments } from "@/dto/order.dto";
import { useFetchOrder, useSplitOrder } from "@/hooks/useOrder";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { extractErrorMessage } from "@/utils/error";
import { translateSplitToServerIds } from "@/utils/splitOrderItems";
import { BusinessType, OrderType } from "@repo/types";
import { Button, Icon, toast } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";
import { ReceiptModal } from "../ReceiptModal";
import { SplitBillForm } from "../SplitBillForm";
import { TransferOrderModal } from "../TransferOrderModal";
import { MergeOrderModal } from "../MergeOrderModal";
import { useAuthStore } from "@/store/authStore";

type Action = {
  key: string;
  label: string;
  icon?: string;
  variant: "default" | "outline";
  tenantType: BusinessType[];
  disabled?: boolean;
  onClick: () => void;
};

export default function OtherActions() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openModal, closeModal } = useModalStore();

  const {
    order,
    subtotalValue,
    discountValue,
    vatValue,
    splitToNewTab,
    loadOrder,
  } = useOrderStore(
    useShallow((s) => {
      const activeOrder = s.getActiveOrder();

      return {
        order: activeOrder,
        subtotalValue: s.getOrderSubtotal(),
        discountValue: s.getDiscountAmount(),
        vatValue: s.getVATAmount(),
        splitToNewTab: s.splitToNewTab,
        loadOrder: s.loadOrder,
      };
    }),
  );

  const splitOrder = useSplitOrder();
  const fetchOrder = useFetchOrder();

  const shippingFee = order?.shippingFee ?? 0;

  const total = subtotalValue - discountValue + shippingFee + vatValue;

  const paidAmount = order?.paidAmount ?? 0;

  const remainingTotal = Math.max(0, total - paidAmount);

  const deliveryNeedsCustomer =
    order?.type === OrderType.DELIVERY && !order?.customerId;

  const deliveryNeedsAddress =
    order?.type === OrderType.DELIVERY &&
    !!order?.customerId &&
    !order?.customerAddress;

  const handleNavigateToRefund = () => {
    navigate({ to: "/refunds" });
    closeModal();
  };

  const handleSplitBill = () => {
    if (!order) return;

    const isServerOrder = !order.id.startsWith("order-");
    // Items batch-synced on send-to-kitchen keep their temporary local ids in
    // the tab, so "unsynced" means never sent anywhere: local id AND not sent.
    const hasUnsyncedItems = order.items.some(
      (i) => i.id.startsWith("item-") && !i.sentToKitchen,
    );

    // The server only knows synced items — new local ones can't be split yet.
    if (isServerOrder && hasUnsyncedItems) {
      toast.error(
        "Send the new items to the kitchen or save them before splitting the bill",
      );
      return;
    }

    // Open instantly — no network round trip gates the modal.
    openModal(
      "Split Bill",
      <SplitBillForm
        order={order}
        onConfirm={(items) => {
          // Local-only order: nothing exists server-side yet, split the tab.
          if (!isServerOrder) {
            const newTabId = splitToNewTab(items);
            if (newTabId) {
              toast.success("Items split into a new tab");
            } else {
              toast.error("Failed to split items");
            }
            return;
          }

          // Server-backed order: reflect the split in the UI immediately —
          // the user should never wait on the network — then reconcile with
          // the backend in the background. The split endpoint needs real
          // server item ids, but items already sent to the kitchen keep
          // their local id in the tab (nothing rewrites it after sync), so
          // the background step re-fetches and translates by product/price/
          // notes instead of relying on the ids the user split against.
          const sourceOrderId = order.id;
          const sourceTabId = useOrderStore.getState().activeTabId;
          const sourceItemsSnapshot = order.items;

          const newTabId = splitToNewTab(items);
          if (!newTabId || !sourceTabId) {
            toast.error("Failed to split items");
            return;
          }
          toast.success("Items split into a new tab");

          void (async () => {
            try {
              const fresh = await fetchOrder(sourceOrderId);
              const translated = translateSplitToServerIds(
                items,
                sourceItemsSnapshot,
                fresh.items ?? [],
              );

              const { originalOrder, newOrder } =
                await splitOrder.mutateAsync({
                  id: sourceOrderId,
                  items: translated,
                });

              // Quietly swap in the authoritative data — same items/prices
              // the user already sees, just real ids and order numbers.
              loadOrder(originalOrder as ServerOrderWithPayments, true);
              useOrderStore
                .getState()
                .hydrateTab(newTabId, newOrder as ServerOrderWithPayments);
            } catch (error) {
              useOrderStore
                .getState()
                .revertSplit(sourceTabId, sourceItemsSnapshot, newTabId);
              toast.error(
                extractErrorMessage(
                  error,
                  "Failed to sync the split with the server — reverted",
                ),
              );
            }
          })();
        }}
      />,
    );
  };

  const handlePrintReceipt = () => {
    openModal("Receipt Preview", <ReceiptModal />);
  };

  const handleTransfer = () => {
    openModal("Transfer Order", <TransferOrderModal />);
  };

  const handleMerge = () => {
    openModal("Merge Order", <MergeOrderModal />);
  };

  const actions: Action[] = [
    {
      key: "refund",
      label: "Refund",
      icon: "RotateCw",
      variant: "outline" as const,
      disabled: false,
      tenantType: ["RESTAURANT", "RETAIL"],
      onClick: handleNavigateToRefund,
    },

    {
      key: "print-receipt",
      label: "Print Receipt",
      icon: "Printer",
      tenantType: ["RESTAURANT", "RETAIL"],
      variant: "outline" as const,
      disabled: !order?.items?.length,
      onClick: handlePrintReceipt,
    },

    {
      key: "split-bill",
      label: "Split Bill",
      icon: "Scissors",
      tenantType: ["RESTAURANT", "RETAIL"],
      variant: "outline" as const,
      disabled:
        !order?.items?.length ||
        remainingTotal <= 0 ||
        deliveryNeedsCustomer ||
        deliveryNeedsAddress,
      onClick: handleSplitBill,
    },
    {
      key: "transfer-order",
      label: "Transfer",
      icon: "ArrowRightLeft",
      tenantType: ["RESTAURANT"],
      variant: "outline" as const,
      disabled: !order?.id,
      onClick: handleTransfer,
    },
    {
      key: "merge-order",
      label: "Merge",
      icon: "Merge",
      tenantType: ["RESTAURANT"],
      variant: "outline" as const,
      disabled: !order?.id,
      onClick: handleMerge,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions
        .filter(
          (action) =>
            user &&
            user.tenant &&
            action.tenantType?.includes(
              user?.tenant?.businessType as BusinessType,
            ),
        )
        .map((action) => (
          <Button
            key={action.key}
            size="lg"
            variant={action.variant}
            className="h-16 px-4"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon && <Icon name={action.icon} className="h-5 w-5" />}

            {action.label}
          </Button>
        ))}
    </div>
  );
}
