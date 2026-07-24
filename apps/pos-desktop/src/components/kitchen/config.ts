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
  [OrderStatus.PLACED]: "bg-orange-100 text-orange-800 border-orange-200",
  [OrderStatus.PREPARING]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [OrderStatus.READY]: "bg-green-100 text-green-800 border-green-200",
} as Record<OrderStatus, string>;

export const getStatusColor = (status: OrderStatus): string => {
  return statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200";
};

const statusIcons = {
  [OrderStatus.PLACED]: "ChefHat",
  [OrderStatus.PREPARING]: "Clock",
  [OrderStatus.READY]: "CircleCheck",
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

// The kitchen only advances cooking progress: PLACED → PREPARING → READY.
// Serving, payment, and closing are floor/cashier actions — never KDS.
const actionButtonStatuses: Record<string, ActionButtonStatus> = {
  PLACED: {
    nextStatus: OrderStatus.PREPARING,
    buttonLabel: "Start Cooking",
  },
  PREPARING: {
    nextStatus: OrderStatus.READY,
    buttonLabel: "Mark Ready",
  },
  READY: {
    nextStatus: OrderStatus.SERVED,
    buttonLabel: "Awaiting Pickup",
  },
};

export const getActionButtonStatus = (
  status: OrderStatus,
  orderType?: OrderType,
): ActionButtonStatus => {
  // Takeaway and delivery are never closed from the KDS. A settled one closes
  // itself the moment the kitchen marks it READY; an unsettled one closes when
  // the money is recorded — at the register for takeaway, or from the Delivery
  // Orders modal when the driver returns. The kitchen also isn't permitted
  // READY → COMPLETED, so offering the button here would only 403 for a real
  // kitchen account. Anything still on the board at READY is awaiting payment.
  if (
    status === OrderStatus.READY &&
    (orderType === OrderType.TAKEAWAY || orderType === OrderType.DELIVERY)
  ) {
    return { nextStatus: null, buttonLabel: "Awaiting Payment" };
  }

  return actionButtonStatuses[status] || { nextStatus: null, buttonLabel: "" };
};

export const ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: OrderStatus | "ALL";
}> = [
  { label: "All", value: "ALL" },
  { label: "Placed", value: OrderStatus.PLACED },
  { label: "Preparing", value: OrderStatus.PREPARING },
  { label: "Ready", value: OrderStatus.READY },
];
