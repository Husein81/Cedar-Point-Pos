import { PurchaseOrderStatus } from "@repo/types";

export const getPurchaseOrderStatusConfig = (
  status: string
): { label: string; className: string } => {
  switch (status) {
    case PurchaseOrderStatus.RECEIVED:
      return { label: "Received", className: "bg-green-500 text-white" };
    case PurchaseOrderStatus.PENDING:
      return {
        label: "Pending",
        className: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
      };
    case PurchaseOrderStatus.ORDERED:
      return { label: "Ordered", className: "bg-blue-500 text-white" };
    case PurchaseOrderStatus.CANCELLED:
      return {
        label: "Cancelled",
        className: "bg-red-500/15 text-red-600 border border-red-500/30",
      };
    default:
      return { label: status, className: "" };
  }
};
