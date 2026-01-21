import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { Button, cn, Icon } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";

const OrderActions = () => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModalStore();
  const { closeKeypad, context, itemId } = useKeypadStore();
  const { getActiveOrder, getOrderSubtotal, setDiscount, toggleVAT } =
    useOrderStore();

  const order = getActiveOrder();
  const subtotal = getOrderSubtotal();

  const handleOpenOrderDiscount = () => {
    const currentDiscount = order?.discount;
    const discountValue = currentDiscount?.value ?? 0;
    const discountTypeValue = currentDiscount?.type ?? "PERCENTAGE";

    // Close current keypad and open new one for order discount
    closeKeypad();

    // Use openKeypad to set up order-level discount context
    // Note: no itemId means it's order-level discount
    const openKeypad = useKeypadStore.getState().openKeypad;
    openKeypad({
      context: "DISCOUNT",
      currentValue: discountValue,
      discountType: discountTypeValue,
      onConfirm: () => {},
      onDiscountChange: (value, type) => {
        setDiscount({
          value,
          type,
        });
      },
      maxValueOverride: subtotal,
    });
  };

  const handleOpenModal = () => {
    openModal(
      "Actions",
      <Button
        onClick={() => {
          navigate({ to: "/refunds" });
          closeModal();
        }}
        size="lg"
        className="flex-1 rounded-xs"
        iconName="RotateCw"
      >
        Refund
      </Button>,
    );
  };

  return (
    <div className="flex items-center justify-evenly gap-1 border-b border-border  px-1 py-1">
      {/* VAT Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-1 rounded-xs px-3 font-semibold flex-1",
          order?.includeVAT
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent/40",
        )}
        onClick={toggleVAT}
      >
        <Icon name="Receipt" className="h-4 w-4" />
        VAT 11%
      </Button>

      <div className="h-8 w-px bg-border mx-0.5" />

      {/* Order Discount */}
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "flex items-center gap-1 rounded-xs px-3 flex-1",
          context === "DISCOUNT" && !itemId
            ? "bg-accent/15 text-primary"
            : "text-muted-foreground hover:bg-accent/40",
        )}
        onClick={handleOpenOrderDiscount}
      >
        <Icon name="Percent" className="h-4 w-4" />
        Discount
      </Button>

      {/* Spacer */}
      <div className="" />

      {/* More Actions */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-xs text-primary hover:bg-accent/50"
        onClick={handleOpenModal}
      >
        <Icon name="EllipsisVertical" className="h-4 w-4" />
      </Button>
    </div>
  );
};
export default OrderActions;
