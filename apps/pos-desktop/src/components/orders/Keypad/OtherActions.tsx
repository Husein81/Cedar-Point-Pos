import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { Button, Icon, toast } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";
import { ReceiptModal } from "../ReceiptModal";
import { SplitBillForm } from "../SplitBillForm";

type Action = {
  key: string;
  label: string;
  icon?: string;
  variant: "default" | "outline";
  disabled?: boolean;
  onClick: () => void;
};

export default function OtherActions() {
  const navigate = useNavigate();

  const { openModal, closeModal } = useModalStore();

  const { order, subtotalValue, discountValue, vatValue, splitToNewTab } =
    useOrderStore(
      useShallow((s) => {
        const activeOrder = s.getActiveOrder();

        return {
          order: activeOrder,
          subtotalValue: s.getOrderSubtotal(),
          discountValue: s.getDiscountAmount(),
          vatValue: s.getVATAmount(),
          splitToNewTab: s.splitToNewTab,
        };
      }),
    );

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

  const handleSplitBill = () => {
    if (!order) return;
    openModal(
      "Split Bill",
      <SplitBillForm
        order={order}
        onConfirm={(items) => {
          const newTabId = splitToNewTab(items);
          if (newTabId) {
            toast.success("Items split into a new tab");
          } else {
            toast.error("Failed to split items");
          }
        }}
      />,
    );
  };

  const handlePrintReceipt = () => {
    openModal("Receipt Preview", <ReceiptModal />);
  };

  const actions: Action[] = [
    {
      key: "refund",
      label: "Refund",
      icon: "RotateCw",
      variant: "outline" as const,
      disabled: false,
      onClick: () => {
        navigate({ to: "/refunds" });
        closeModal();
      },
    },

    {
      key: "print-receipt",
      label: "Print Receipt",
      icon: "Printer",
      variant: "outline" as const,
      disabled: !order?.items?.length,
      onClick: handlePrintReceipt,
    },

    {
      key: "split-bill",
      label: "Split Bill",
      icon: "Scissors",
      variant: "outline" as const,
      disabled:
        !order?.items?.length ||
        remainingTotal <= 0 ||
        deliveryNeedsCustomer ||
        deliveryNeedsAddress,
      onClick: handleSplitBill,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((action) => (
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
