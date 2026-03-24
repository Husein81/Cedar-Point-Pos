import { useAuthStore } from "@/store/authStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { Button, cn, Icon, Textarea } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";

const ORDER_TYPE_OPTIONS = {
  RESTAURANT: [
    { type: OrderType.DINE_IN, label: "Dine-In", icon: "UtensilsCrossed" },
    { type: OrderType.TAKEAWAY, label: "Takeaway", icon: "ShoppingBag" },
    { type: OrderType.DELIVERY, label: "Delivery", icon: "Truck" },
  ],
  RETAIL: [
    { type: OrderType.RETAIL, label: "Pickup", icon: "ShoppingBag" },
    { type: OrderType.DELIVERY, label: "Delivery", icon: "Truck" },
  ],
} as const;

const NOTE_CHIPS = [
  "Wait",
  "Rush",
  "To Serve",
  "Allergies",
  "No Spice",
  "Extra Sauce",
] as const;

const ItemNoteContent = ({
  initialNote,
  onSave,
}: {
  initialNote: string;
  onSave: (note: string) => void;
}) => {
  const [note, setNote] = useState(initialNote);

  const handleChip = useCallback((chip: string) => {
    setNote((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${chip}` : chip;
    });
  }, []);

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => handleChip(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>

      <Textarea
        placeholder="Add a note for this item..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-24 resize-none text-sm"
        autoFocus
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setNote("");
            onSave("");
          }}
        >
          Clear
        </Button>
        <Button className="flex-1" onClick={() => onSave(note)}>
          <Icon name="Check" className="w-4 h-4 mr-1" />
          Save Note
        </Button>
      </div>
    </div>
  );
};

const OrderActions = () => {
  const navigate = useNavigate();
  const { openModal, closeModal } = useModalStore();
  const { closeKeypad, context, itemId } = useKeypadStore();
  const {
    getActiveOrder,
    setOrderType,
    setShippingFee,
    setTable,
    updateItemNotes,
    toggleVAT,
  } = useOrderStore();
  const { user } = useAuthStore();

  const order = getActiveOrder();
  const isDelivery = order?.type === OrderType.DELIVERY;
  const isRestaurant = user?.tenant?.businessType === "RESTAURANT" || false;

  const currentType = order?.type
    ? order.type
    : isRestaurant
      ? OrderType.DINE_IN
      : OrderType.RETAIL;

  const currentTypeLabel =
    [...ORDER_TYPE_OPTIONS.RESTAURANT, ...ORDER_TYPE_OPTIONS.RETAIL].find(
      (o) => o.type === currentType,
    )?.label ?? "Type";

  const handleSelectOrderType = (type: OrderType) => {
    setOrderType(type);

    if (type === OrderType.DELIVERY) {
      // Delivery orders cannot have a table
      setTable(null, null);
    }

    if (type !== OrderType.DELIVERY) {
      setShippingFee(0);
      if (context === "SHIPPING") {
        closeKeypad();
      }
    }

    closeModal();
  };

  const handleOpenOrderType = () => {
    const options = isRestaurant
      ? ORDER_TYPE_OPTIONS.RESTAURANT
      : ORDER_TYPE_OPTIONS.RETAIL;

    openModal(
      "Order Type",
      <div className="max-w-sm mx-auto grid gap-2">
        {options.map((opt) => (
          <Button
            key={opt.type}
            size="lg"
            variant={currentType === opt.type ? "default" : "outline"}
            className={cn(
              "w-full justify-start gap-3 h-14 text-base",
              currentType === opt.type && "ring-2 ring-primary/30",
            )}
            onClick={() => handleSelectOrderType(opt.type)}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/20 shrink-0">
              <Icon name={opt.icon} className="w-5 h-5" />
            </div>
            <span className="flex-1 text-left font-medium">{opt.label}</span>
            {currentType === opt.type && (
              <Icon name="Check" className="w-5 h-5 shrink-0" />
            )}
          </Button>
        ))}
      </div>,
      "Select how this order will be fulfilled.",
    );
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
        className="flex-1"
        iconName="RotateCw"
      >
        Refund
      </Button>,
    );
  };

  const handleOpenShippingFee = () => {
    const currentFee = order?.shippingFee ?? 0;

    closeKeypad();

    const openKeypad = useKeypadStore.getState().openKeypad;
    openKeypad({
      context: "SHIPPING",
      currentValue: currentFee,
      onConfirm: (value) => {
        setShippingFee(value);
      },
    });
  };

  const handleOpenItemNote = () => {
    if (!itemId || !order) return;

    const selectedItem = order.items.find((i) => i.id === itemId);
    if (!selectedItem) return;

    openModal(
      `Note — ${selectedItem.name}`,
      <ItemNoteContent
        initialNote={selectedItem.notes ?? ""}
        onSave={(note) => {
          updateItemNotes(itemId, note);
          closeModal();
        }}
      />,
    );
  };

  return (
    <div className="flex items-center justify-evenly gap-1 border-b border-border  px-1 py-1">
      {/* VAT Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex items-center gap-1 px-3 font-semibold flex-1",
          order?.includeVAT
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent/40",
        )}
        onClick={toggleVAT}
      >
        <Icon name="Receipt" className="h-4 w-4" />
        VAT 11%
      </Button>

      {isDelivery && (
        <>
          <div className="h-8 w-px bg-border mx-0.5" />
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "flex items-center gap-1 px-3 flex-1",
              context === "SHIPPING"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/40",
            )}
            onClick={handleOpenShippingFee}
          >
            <Icon name="Truck" className="h-4 w-4" />
            Shipping
          </Button>
        </>
      )}

      {itemId && (
        <>
          <div className="h-8 w-px bg-border mx-0.5" />
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "flex items-center gap-1 px-3 flex-1",
              order?.items.find((i) => i.id === itemId)?.notes
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent/40",
            )}
            onClick={handleOpenItemNote}
          >
            <Icon name="StickyNote" className="h-4 w-4" />
            Note
          </Button>
        </>
      )}

      <div className="h-8 w-px bg-border mx-0.5" />

      {/* Order Type */}
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "flex items-center gap-1 px-3 flex-1",
          order?.type
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent/40",
        )}
        onClick={handleOpenOrderType}
      >
        <Icon name="ClipboardList" className="h-4 w-4" />
        {currentTypeLabel}
      </Button>

      {/* More Actions */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-primary hover:bg-accent/50"
        onClick={handleOpenModal}
      >
        <Icon name="EllipsisVertical" className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default OrderActions;
