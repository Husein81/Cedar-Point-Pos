import { VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import { useAuthStore } from "@/store/authStore";
import { useKeypadStore } from "@/store/keypadStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import { OrderType } from "@repo/types";
import { Button, cn, Icon } from "@repo/ui";
import { CustomerSelector } from "./CustomerSelector";
import { TableSelector } from "./TableSelector";

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

const HeaderChip = ({
  icon,
  label,
  active,
  onClick,
  ariaLabel,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) => (
  <button
    type="button"
    aria-label={ariaLabel ?? label}
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    <Icon name={icon} className="h-3.5 w-3.5" />
    {label}
  </button>
);

/** Cart header: order identity, order-level toggles, and customer binding. */
export const OrderHeader = () => {
  const { openModal, closeModal } = useModalStore();
  const { closeKeypad, context } = useKeypadStore();
  const {
    getActiveOrder,
    clearOrder,
    setOrderType,
    setShippingFee,
    setTable,
    toggleVAT,
  } = useOrderStore();
  const { user } = useAuthStore();

  const order = getActiveOrder();
  const items = order?.items ?? [];
  const isRestaurant = user?.tenant?.businessType === "RESTAURANT";
  const isDineIn = (order?.type ?? OrderType.DINE_IN) === OrderType.DINE_IN;

  const currentType = order?.type
    ? order.type
    : isRestaurant
      ? OrderType.DINE_IN
      : OrderType.RETAIL;

  const currentTypeOption = [
    ...ORDER_TYPE_OPTIONS.RESTAURANT,
    ...ORDER_TYPE_OPTIONS.RETAIL,
  ].find((o) => o.type === currentType);

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
            <div className="flex items-center justify-center w-10 h-10 rounded-sm-lg bg-background/20 shrink-0">
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

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-muted/30 px-3 py-2">
      {/* Identity row */}
      <div className="flex items-center gap-2">
        <Icon name="ShoppingCart" className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Order</h2>
        {items.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {items.length}
          </span>
        )}

        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearOrder();
              closeKeypad();
            }}
            className="ml-auto h-7 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon name="Trash2" className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Order-level chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <HeaderChip
          icon={currentTypeOption?.icon ?? "ClipboardList"}
          label={currentTypeOption?.label ?? "Type"}
          active={!!order?.type}
          onClick={handleOpenOrderType}
          ariaLabel="Change order type"
        />

        <HeaderChip
          icon="Receipt"
          label={`VAT ${VAT_RATE_PERCENT_LABEL}`}
          active={!!order?.includeVAT}
          onClick={toggleVAT}
          ariaLabel="Toggle VAT"
        />

        {isRestaurant && isDineIn && <TableSelector />}
      </div>

      <CustomerSelector />
    </div>
  );
};
