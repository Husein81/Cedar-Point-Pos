import { OrderStatus } from "@repo/types";

export const getStatusBadge = (
  status: OrderStatus,
  hasRefunds: boolean = false,
): {
  className: string;
  label: string;
} => {
  if (hasRefunds) {
    return {
      className: "bg-orange-100 text-orange-700",
      label: "Partially Refunded",
    };
  }

  switch (status) {
    case OrderStatus.FULLY_REFUNDED:
      return {
        className: "bg-purple-100 text-purple-700",
        label: "Fully Refunded",
      };
    case OrderStatus.COMPLETED:
      return {
        className: "bg-blue-100 text-blue-700",
        label: "Completed",
      };
    default:
      return {
        className: "bg-gray-100 text-gray-700",
        label: status,
      };
  }
};

export const formatPaymentMethod = (method: string | null) => {
  if (!method) return "N/A";
  return method.charAt(0) + method.slice(1).toLowerCase();
};
