export const statusConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  DRAFT: { label: "Draft", color: "bg-gray-500", icon: "FileEdit" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-500", icon: "PauseCircle" },
  PENDING: { label: "Pending", color: "bg-blue-500", icon: "Clock" },
  CONFIRMED: { label: "Confirmed", color: "bg-cyan-500", icon: "CircleCheck" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-500", icon: "Loader" },
  SENT_TO_KITCHEN: {
    label: "In Kitchen",
    color: "bg-purple-500",
    icon: "ChefHat",
  },
  READY: { label: "Ready", color: "bg-green-500", icon: "Package" },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-600",
    icon: "CheckCheck",
  },
  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    color: "bg-amber-600",
    icon: "RotateCcw",
  },
  FULLY_REFUNDED: {
    label: "Fully Refunded",
    color: "bg-purple-600",
    icon: "RotateCcw",
  },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: "XCircle" },
  PAID: { label: "Paid", color: "bg-green-500", icon: "Wallet" },
};

export const orderTypeConfig: Record<string, { label: string; icon: string }> =
  {
    DINE_IN: { label: "Dine In", icon: "Utensils" },
    TAKEAWAY: { label: "Takeaway", icon: "ShoppingBag" },
    DELIVERY: { label: "Delivery", icon: "Truck" },
    RETAIL: { label: "Retail", icon: "Store" },
  };

type ItemDiscount = { type: "PERCENTAGE" | "FIXED"; value: number };

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeItemDiscountAmount(
  item: {
    quantity: string | number;
    unitPrice: string | number;
    modifiers?: Array<{ price?: string | number | null }>;
  },
  discount?: ItemDiscount | null,
): number {
  if (!discount || discount.value <= 0) return 0;

  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const modifiersTotal = (item.modifiers ?? []).reduce(
    (sum, mod) => sum + Number(mod.price || 0),
    0,
  );

  const base = (unitPrice + modifiersTotal) * quantity;
  if (base <= 0) return 0;

  const raw =
    discount.type === "PERCENTAGE"
      ? (base * discount.value) / 100
      : discount.value;

  return Math.max(0, roundMoney(raw));
}
