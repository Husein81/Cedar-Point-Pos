import { OrderStatus } from "@repo/types";
import type { RefundableItem } from "@/dto/refund.dto";

export const REFUND_ORDERS_PAGE_SIZE = 12;

// Shared reason codes for both the refund station and the quick-refund modal.
export const REFUND_REASONS = [
  { value: "DAMAGED", label: "Damaged item", icon: "PackageX" },
  { value: "WRONG_ITEM", label: "Wrong item", icon: "ArrowLeftRight" },
  { value: "CUSTOMER_REQUEST", label: "Changed mind", icon: "UserX" },
  { value: "QUALITY_ISSUE", label: "Quality issue", icon: "ShieldAlert" },
  { value: "OTHER", label: "Other", icon: "MessageSquare" },
] as const;

export const getReasonLabel = (value: string): string =>
  REFUND_REASONS.find((r) => r.value === value)?.label ?? value;

/** Combine a reason code and free-text note into the API `reason` string. */
export const buildRefundReason = (
  reason: string,
  note: string,
): string | undefined => {
  if (reason && note) return `${reason}: ${note}`;
  return reason || note || undefined;
};

/** A refundable order item merged with the cashier's draft quantity. */
export interface RefundLine extends RefundableItem {
  refundQuantity: number;
  lineTotal: number;
  isSelected: boolean;
}

/**
 * Merge server refundable items with the draft quantities map. Quantities are
 * clamped so a stale draft (e.g. right after a refund refetch) can never
 * exceed what is still refundable.
 */
export const buildRefundLines = (
  items: RefundableItem[],
  quantities: Record<string, number>,
): RefundLine[] =>
  items.map((item) => {
    const refundQuantity = Math.max(
      0,
      Math.min(quantities[item.orderItemId] ?? 0, item.refundableQuantity),
    );
    return {
      ...item,
      refundQuantity,
      lineTotal: refundQuantity * item.unitPrice,
      isSelected: refundQuantity > 0,
    };
  });

export const getSelectedLines = (lines: RefundLine[]): RefundLine[] =>
  lines.filter((line) => line.refundQuantity > 0);

export const getRefundTotal = (lines: RefundLine[]): number =>
  lines.reduce((sum, line) => sum + line.lineTotal, 0);

/** True when every remaining refundable unit is selected. */
export const isFullRefund = (lines: RefundLine[]): boolean =>
  lines.every(
    (line) =>
      line.refundableQuantity === 0 ||
      line.refundQuantity === line.refundableQuantity,
  );

export const getStatusBadge = (
  status: OrderStatus,
  hasRefunds: boolean = false,
): { className: string; label: string } => {
  if (hasRefunds && status !== OrderStatus.FULLY_REFUNDED) {
    return {
      className:
        "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      label: "Partially Refunded",
    };
  }

  switch (status) {
    case OrderStatus.FULLY_REFUNDED:
      return {
        className:
          "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
        label: "Fully Refunded",
      };
    case OrderStatus.PARTIALLY_REFUNDED:
      return {
        className:
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        label: "Partially Refunded",
      };
    case OrderStatus.PAID:
      return {
        className:
          "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
        label: "Paid",
      };
    case OrderStatus.COMPLETED:
      return {
        className:
          "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
        label: "Completed",
      };
    default:
      return {
        className: "bg-muted text-muted-foreground border-border",
        label: status,
      };
  }
};

export const formatPaymentMethod = (method: string | null): string => {
  if (!method) return "N/A";
  return method.charAt(0) + method.slice(1).toLowerCase();
};
