import { Button } from "@repo/ui";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";

interface OrderSummaryProps {
  className?: string;
  onCompleteOrder?: () => void;
  onHoldOrder?: () => void;
}

export const OrderSummary = ({ className, onCompleteOrder, onHoldOrder }: OrderSummaryProps) => {
  const {
    getActiveOrder,
    getOrderTotal,
    setOrderStatus,
    clearOrder,
  } = useOrderStore();

  const order = getActiveOrder();
  const total = getOrderTotal();
  const hasItems = order && order.items.length > 0;

  // Validation rules
  const canComplete = hasItems && total > 0;
  const canHold = hasItems;

  // Format currency for Lebanese retail (LBP)
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return "N/A";
    return new Intl.NumberFormat("en-LB", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleComplete = () => {
    if (!canComplete) return;
    setOrderStatus("COMPLETED");
    clearOrder();
    onCompleteOrder?.();
  };

  const handleHold = () => {
    if (!canHold) return;
    setOrderStatus("ON_HOLD");
    onHoldOrder?.();
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-3xl font-bold text-primary">
          {formatPrice(total)} LBP
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          size="lg"
          className="flex-1 h-14 text-lg"
          onClick={handleComplete}
          disabled={!canComplete}
        >
          Complete Order
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 h-14 text-lg"
          onClick={handleHold}
          disabled={!canHold}
        >
          Hold
        </Button>
      </div>
    </div>
  );
};
