import { Button, cn, Icon } from "@repo/ui";
import { useState } from "react";
import { NumericKeypad } from "../common/NumericKeypad";
import type { KeypadContext } from "../common/config";
import { formatPrice } from "./config";

type CartItemProps = {
  item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
  };
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

export const CartItem = ({
  item,
  onQuantityChange,
  onRemove,
}: CartItemProps) => {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const keypadContext: KeypadContext = "QUANTITY";

  const increaseQty = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  const decreaseQty = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const handleKeypadConfirm = (value: number) => {
    if (value > 0) {
      onQuantityChange(item.id, value);
    }
    setKeypadOpen(false);
  };

  return (
    <div
      className={cn(
        "flex gap-2 px-4 py-2 rounded-lg",
        "bg-background  border border-border/60",
        "hover:bg-muted/40 transition-colors"
      )}
    >
      {/* Product Image */}
      {item.imageUrl && (
        <div className="">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="size-14 rounded-md object-cover bg-muted"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Row 1 — Name + Remove */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
            {item.name}
          </p>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(item.id)}
          >
            <Icon name="X" className="h-4 w-4" />
          </Button>
        </div>

        {/* Row 2 — Unit Price + Quantity Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            ${formatPrice(item.price)} per item
          </div>
        </div>

        {/* Row 3 — Line Total */}
        <div className="flex justify-between text-right">
          {/* Quantity Controls */}
          <div className="flex items-center gap-0.5 bg-background rounded-lg border shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-l-lg rounded-r-none"
              onClick={decreaseQty}
              disabled={item.quantity <= 1}
            >
              <Icon name="Minus" className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setKeypadOpen(true)}
              className="w-7 h-7 text-center text-sm font-semibold tabular-nums bg-muted/30 rounded-none"
            >
              {item.quantity}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-r-lg rounded-l-none"
              onClick={increaseQty}
            >
              <Icon name="Plus" className="w-3 h-3" />
            </Button>
          </div>

          <span className="text-base font-bold text-primary tabular-nums">
            ${formatPrice(item.price * item.quantity)}
          </span>
        </div>

        {/* Numeric Keypad (Optional / Contextual) */}
        <NumericKeypad
          isOpen={keypadOpen}
          onClose={() => setKeypadOpen(false)}
          currentValue={item.quantity}
          onConfirm={handleKeypadConfirm}
          context={keypadContext}
        />
      </div>
    </div>
  );
};
