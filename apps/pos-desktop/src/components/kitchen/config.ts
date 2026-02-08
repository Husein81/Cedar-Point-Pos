import { OrderStatus, OrderType } from "@repo/types";

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
    case OrderStatus.FULLY_REFUNDED:
      return {
        nextStatus: null,
        buttonLabel: "Order Fully Refunded",
      };
    default:
      return {
        nextStatus: null,
        buttonLabel: "",
      };
  }
};
