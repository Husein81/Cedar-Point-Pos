import { useKeypadStore } from "@/store/keypadStore";
import { Button, Icon } from "@repo/ui";

type Props = {
  openDiscountForOrder: (value: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED") => void;
  openDiscountForItem: (value: "DISCOUNT_PERCENT" | "DISCOUNT_FIXED") => void;
};

export default function ApplyDiscount({
  openDiscountForItem,
  openDiscountForOrder,
}: Props) {
  const { itemId } = useKeypadStore();
  const hasSelectedItem = !!itemId;

  return (
    <div className="max-w-sm mx-auto grid grid-cols-2 gap-2">
      <Button
        size="lg"
        variant="outline"
        className="h-14 flex-col gap-1"
        disabled={!hasSelectedItem}
        onClick={() => openDiscountForItem("DISCOUNT_PERCENT")}
      >
        <Icon name="Percent" className="w-5 h-5" />
        <span className="text-xs font-medium">Line Discount</span>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 flex-col gap-1"
        disabled={!hasSelectedItem}
        onClick={() => openDiscountForItem("DISCOUNT_FIXED")}
      >
        <Icon name="DollarSign" className="w-5 h-5" />
        <span className="text-xs font-medium">Line Discount</span>
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="h-14 flex-col gap-1"
        onClick={() => openDiscountForOrder("DISCOUNT_PERCENT")}
      >
        <Icon name="Percent" className="w-5 h-5" />
        <span className="text-xs font-medium">Total Discount</span>
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="h-14 flex-col gap-1"
        onClick={() => openDiscountForOrder("DISCOUNT_FIXED")}
      >
        <Icon name="DollarSign" className="w-5 h-5" />
        <span className="text-xs font-medium">Total Discount</span>
      </Button>

      {!hasSelectedItem && (
        <p className="col-span-2 text-xs text-muted-foreground text-center mt-1">
          Select a cart item first to apply a line discount.
        </p>
      )}
    </div>
  );
}
