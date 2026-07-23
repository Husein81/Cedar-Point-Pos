import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import { DiscountType } from "@/shared/enums";
import { cn, Icon, Separator } from "@repo/ui";
import { formatMoney } from "@/utils/format";
import { Activity } from "react";

const Row = ({
  label,
  value,
  variant = "normal",
  onClick,
  active,
  editable,
}: {
  label: string;
  value: React.ReactNode;
  variant?: "normal" | "discount" | "charge";
  onClick?: () => void;
  active?: boolean;
  editable?: boolean;
}) => {
  const content = (
    <>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {editable && <Icon name="Pencil" className="h-2.5 w-2.5 opacity-50" />}
      </span>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          variant === "discount" && "text-destructive",
        )}
      >
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "-mx-1 flex w-[calc(100%+0.5rem)] items-center justify-between rounded px-1 py-0.5",
          "transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active && "bg-primary/10",
        )}
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center justify-between py-0.5">{content}</div>;
};

type Props = {
  currencySymbol: string;
  taxRate: number;
};

/** Totals breakdown — subtotal, discount, tax, and the amount due. */
const OrderSummary = ({ currencySymbol, taxRate }: Props) => {
  const { getActiveOrder, getDiscountAmount, getOrderSubtotal, setDiscount } =
    useOrderStore();
  const { closeKeypad, context, itemId } = useKeypadStore();

  const order = getActiveOrder();

  const orderDiscount = getDiscountAmount();
  const subtotal = getOrderSubtotal();
  const taxable = Math.max(0, subtotal - orderDiscount);
  const taxAmount = taxable * taxRate;
  const total = taxable + taxAmount;

  const isOrderDiscountActive =
    !itemId &&
    (context === "DISCOUNT_PERCENT" || context === "DISCOUNT_FIXED");

  const handleEditOrderDiscount = () => {
    const discountType = order?.discount?.type ?? DiscountType.PERCENT;
    const keypadContext =
      discountType === DiscountType.PERCENT ? "DISCOUNT_PERCENT" : "DISCOUNT_FIXED";

    closeKeypad();
    useKeypadStore.getState().openKeypad({
      context: keypadContext,
      currentValue: order?.discount?.value ?? 0,
      discountType,
      onConfirm: () => {},
      onDiscountChange: (value, type) => setDiscount({ value, type }),
      maxValueOverride: discountType === DiscountType.FIXED ? subtotal : undefined,
    });
  };

  const hasBreakdown = subtotal > 0 || orderDiscount > 0 || taxRate > 0;

  return (
    <div className="border-t border-border bg-muted/20 px-3 pb-2 pt-1.5">
      {hasBreakdown && (
        <div className="space-y-px pb-1.5">
          <Row label="Subtotal" value={formatMoney(subtotal, currencySymbol)} />

          {orderDiscount > 0 && (
            <Row
              label="Order Discount"
              value={`− ${formatMoney(orderDiscount, currencySymbol)}`}
              variant="discount"
              onClick={handleEditOrderDiscount}
              active={isOrderDiscountActive}
              editable
            />
          )}

          {taxRate > 0 && (
            <Row
              label={`Tax (${(taxRate * 100).toFixed(0)}%)`}
              value={`+ ${formatMoney(taxAmount, currencySymbol)}`}
              variant="charge"
            />
          )}
        </div>
      )}

      <Activity mode={hasBreakdown ? "visible" : "hidden"}>
        <Separator />
      </Activity>

      <div className="flex items-baseline justify-between border-border/60 pt-1.5">
        <span className="text-sm font-semibold">Total</span>
        <span
          key={total}
          className="animate-in fade-in slide-in-from-bottom-1 text-2xl font-bold tabular-nums tracking-tight text-primary duration-200"
        >
          {formatMoney(total, currencySymbol)}
        </span>
      </div>
    </div>
  );
};

export default OrderSummary;
