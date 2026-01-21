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
  FULLY_REFUNDED: {
    label: "Fully Refunded",
    color: "bg-purple-600",
    icon: "RotateCcw",
  },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: "XCircle" },
};

export const orderTypeConfig: Record<string, { label: string; icon: string }> =
  {
    DINE_IN: { label: "Dine In", icon: "Utensils" },
    TAKEAWAY: { label: "Takeaway", icon: "ShoppingBag" },
    DELIVERY: { label: "Delivery", icon: "Truck" },
    RETAIL: { label: "Retail", icon: "Store" },
  };
