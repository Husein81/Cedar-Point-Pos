import { useModalStore } from "@/store/modalStore";
import { Button, cn, Icon } from "@repo/ui";
import { NumericKeypad } from "../common/NumericKeypad";
import type { KeypadContext } from "../common/config";
import { formatPrice } from "./config";
import { useState } from "react";

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
  const { openModal, closeModal } = useModalStore();
  const keypadContext: KeypadContext = "QUANTITY";

  const [isSelected, setIsSelected] = useState({ id: "", state: false });

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
    closeModal();
  };

  const handleOpenKeypad = () => {
    openModal(
      "Edit Quantity",
      <NumericKeypad
        currentValue={item.quantity}
        onConfirm={handleKeypadConfirm}
        context={keypadContext}
      />
    );
  };

  return (
    <div
      className={cn(
        "flex gap-2 px-3 py-2 rounded-md",
        "bg-background border border-border/60",
        "hover:bg-muted/40 transition-colors",
        isSelected.id === item.id &&
          isSelected.state &&
          "ring-2 ring-primary/40"
      )}
      onClick={() => {
        handleOpenKeypad();
        setIsSelected({ id: item.id, state: true });
      }}
    >
      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Row 1 — Name + Remove */}
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
            {item.name}
          </p>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              (e as React.MouseEvent<HTMLButtonElement>).stopPropagation();
              onRemove(item.id);
            }}
          >
            <Icon name="X" className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Row 2 — Unit Price */}
        <div className="text-xs text-muted-foreground">
          ${formatPrice(item.price)} per item
        </div>

        {/* Row 3 — Qty Controls + Line Total */}
        <div className="flex items-center justify-between gap-2">
          {/* Quantity Controls */}
          <div
            className="flex items-center bg-background rounded-md border shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-l-md rounded-r-none"
              onClick={decreaseQty}
              disabled={item.quantity <= 1}
            >
              <Icon name="Minus" className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-xs font-semibold tabular-nums bg-muted/30 rounded-none"
            >
              {item.quantity}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-r-md rounded-l-none"
              onClick={increaseQty}
            >
              <Icon name="Plus" className="w-3 h-3" />
            </Button>
          </div>

          {/* Line Total */}
          <span className="text-sm font-semibold text-primary tabular-nums">
            ${formatPrice(item.price * item.quantity)}
          </span>
        </div>

        {/* Numeric Keypad */}
      </div>
    </div>
  );
};
