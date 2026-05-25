import { PurchaseOrderStatus } from "@repo/types";

export const getPurchaseOrderStatusConfig = (
  status: string
): { label: string; className: string } => {
  switch (status) {
    case PurchaseOrderStatus.RECEIVED:
      return { label: "Received", className: "bg-green-500" };
    case PurchaseOrderStatus.PENDING:
      return { label: "Pending", className: "" };
    case PurchaseOrderStatus.ORDERED:
      return { label: "Ordered", className: "bg-blue-500" };
    case PurchaseOrderStatus.CANCELLED:
      return { label: "Cancelled", className: "" };
    default:
      return { label: status, className: "" };
  }
};
