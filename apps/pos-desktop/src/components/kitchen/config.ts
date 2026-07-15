import { OrderStatus, OrderType } from "@repo/types";
import { differenceInMinutes } from "date-fns";

// Time thresholds for order urgency (in minutes)
export const ORDER_AGE_URGENT_MINUTES = 15;
export const ORDER_AGE_WARNING_MINUTES = 10;

/**
 * Get the color class for the order time display based on how old the order is.
 * - Red: Orders older than 15 minutes (urgent)
 * - Amber: Orders older than 10 minutes (warning)
 * - White: Fresh orders
 */
export const getTimeColor = (createdAt: string | Date): string => {
  const orderAge = differenceInMinutes(new Date(), new Date(createdAt));
  if (orderAge > ORDER_AGE_URGENT_MINUTES) return "text-red-400 font-bold";
  if (orderAge > ORDER_AGE_WARNING_MINUTES)
    return "text-amber-300 font-semibold";
  return "text-white";
};

const statusColors = {
  [OrderStatus.CONFIRMED]: "bg-blue-100 text-blue-800 border-blue-200",
  [OrderStatus.IN_PROGRESS]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.SENT_TO_KITCHEN]:
    "bg-orange-100 text-orange-800 border-orange-200",
  [OrderStatus.READY]: "bg-green-100 text-green-800 border-green-200",
  [OrderStatus.PAID]: "bg-emerald-100 text-emerald-800 border-emerald-200",
  [OrderStatus.PARTIALLY_PAID]: "bg-amber-100 text-amber-800 border-amber-200",
} as Record<OrderStatus, string>;

export const getStatusColor = (status: OrderStatus): string => {
  return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
};

const statusIcons = {
  [OrderStatus.CONFIRMED]: "CircleAlert",
  [OrderStatus.IN_PROGRESS]: "Clock",
  [OrderStatus.SENT_TO_KITCHEN]: "ChefHat",
  [OrderStatus.READY]: "CircleCheck",
  [OrderStatus.PAID]: "Wallet",
  [OrderStatus.PARTIALLY_PAID]: "WalletCards",
} as Record<OrderStatus, string>;

export const getStatusIcon = (status: OrderStatus): string => {
  return statusIcons[status] || "Clock";
};

export const getOrderTypeHeaderColor = (type: OrderType) => {
  switch (type) {
    case OrderType.DINE_IN:
      return "bg-blue-500";

    case OrderType.DELIVERY:
      return "bg-purple-500";

    default:
      return "bg-amber-500";
  }
};

type ActionButtonStatus = {
  nextStatus: OrderStatus | null;
  buttonLabel: string;
};

const actionButtonStatuses: Record<string, ActionButtonStatus> = {
  CONFIRMED: {
    nextStatus: OrderStatus.IN_PROGRESS,
    buttonLabel: "Start Cooking",
  },
  IN_PROGRESS: {
    nextStatus: OrderStatus.READY,
    buttonLabel: "Mark Ready",
  },
  SENT_TO_KITCHEN: {
    nextStatus: OrderStatus.IN_PROGRESS,
    buttonLabel: "Start Cooking",
  },
  READY: {
    nextStatus: OrderStatus.COMPLETED,
    buttonLabel: "Complete Order",
  },
  PAID: {
    nextStatus: OrderStatus.COMPLETED,
    buttonLabel: "Complete Order",
  },
  PARTIALLY_PAID: {
    nextStatus: null,
    buttonLabel: "Awaiting Full Payment",
  },
  FULLY_REFUNDED: {
    nextStatus: null,
    buttonLabel: "Order Fully Refunded",
  },
};

export const getActionButtonStatus = (
  status: OrderStatus,
): ActionButtonStatus => {
  return actionButtonStatuses[status] || { nextStatus: null, buttonLabel: "" };
};

export const ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: OrderStatus | "ALL";
}> = [
  { label: "All", value: "ALL" },
  { label: "Sent to Kitchen", value: OrderStatus.SENT_TO_KITCHEN },
  { label: "Preparing", value: OrderStatus.IN_PROGRESS },
  { label: "Ready", value: OrderStatus.READY },
  { label: "Completed", value: OrderStatus.COMPLETED },
];
