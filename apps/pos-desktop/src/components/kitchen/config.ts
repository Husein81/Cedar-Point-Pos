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

export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case OrderStatus.IN_PROGRESS:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case OrderStatus.SENT_TO_KITCHEN:
      return "bg-orange-100 text-orange-800 border-orange-200";
    case OrderStatus.READY:
      return "bg-green-100 text-green-800 border-green-200";
    case OrderStatus.PAID:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case OrderStatus.PARTIALLY_PAID:
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const getStatusIcon = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return "CircleAlert";
    case OrderStatus.IN_PROGRESS:
      return "Clock";
    case OrderStatus.SENT_TO_KITCHEN:
      return "ChefHat";
    case OrderStatus.READY:
      return "CircleCheck";
    case OrderStatus.PAID:
      return "Wallet";
    case OrderStatus.PARTIALLY_PAID:
      return "WalletCards";
    default:
      return "Clock";
  }
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

export const getActionButtonStatus = (
  status: OrderStatus,
): ActionButtonStatus => {
  switch (status) {
    case OrderStatus.CONFIRMED:
      return {
        nextStatus: OrderStatus.IN_PROGRESS,
        buttonLabel: "Start Cooking",
      };
    case OrderStatus.IN_PROGRESS:
      return {
        nextStatus: OrderStatus.READY,
        buttonLabel: "Mark Ready",
      };
    case OrderStatus.SENT_TO_KITCHEN:
      return {
        nextStatus: OrderStatus.IN_PROGRESS,
        buttonLabel: "Start Cooking",
      };
    case OrderStatus.READY:
      return {
        nextStatus: OrderStatus.COMPLETED,
        buttonLabel: "Complete Order",
      };
    case OrderStatus.PAID:
      return {
        nextStatus: OrderStatus.COMPLETED,
        buttonLabel: "Complete Order",
      };
    case OrderStatus.PARTIALLY_PAID:
      return {
        nextStatus: null,
        buttonLabel: "Awaiting Full Payment",
      };
    case OrderStatus.FULLY_REFUNDED:
      return {
        nextStatus: null,
        buttonLabel: "Order Fully Refunded",
      };
    case OrderStatus.COMPLETED:
      return {
        nextStatus: null,
        buttonLabel: "Completed",
      };
    default:
      return {
        nextStatus: null,
        buttonLabel: "",
      };
  }
};
