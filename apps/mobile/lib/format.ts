import { OrderStatus, TableStatus } from "@repo/types";

export const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatMoney = (value: number | string | null | undefined): string =>
  `$${toNumber(value).toFixed(2)}`;

export const formatTime = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDateTime = (iso: string | Date): string => {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const initialsOf = (name: string | null | undefined): string =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

type StatusStyle = {
  label: string;
  /** Tailwind classes for the badge container. */
  badge: string;
  /** Tailwind classes for the badge text. */
  text: string;
};

const ORDER_STATUS_STYLES: Record<OrderStatus, StatusStyle> = {
  [OrderStatus.DRAFT]: {
    label: "Draft",
    badge: "bg-muted",
    text: "text-muted-foreground",
  },
  [OrderStatus.ON_HOLD]: {
    label: "On Hold",
    badge: "bg-warning/15",
    text: "text-warning",
  },
  [OrderStatus.PENDING]: {
    label: "Pending",
    badge: "bg-info/15",
    text: "text-info",
  },
  [OrderStatus.CONFIRMED]: {
    label: "Confirmed",
    badge: "bg-info/15",
    text: "text-info",
  },
  [OrderStatus.IN_PROGRESS]: {
    label: "Preparing",
    badge: "bg-warning/15",
    text: "text-warning",
  },
  [OrderStatus.SENT_TO_KITCHEN]: {
    label: "In Kitchen",
    badge: "bg-warning/15",
    text: "text-warning",
  },
  [OrderStatus.READY]: {
    label: "Ready",
    badge: "bg-success/15",
    text: "text-success",
  },
  [OrderStatus.PAID]: {
    label: "Paid",
    badge: "bg-success/15",
    text: "text-success",
  },
  [OrderStatus.PARTIALLY_PAID]: {
    label: "Partially Paid",
    badge: "bg-warning/15",
    text: "text-warning",
  },
  [OrderStatus.COMPLETED]: {
    label: "Completed",
    badge: "bg-success/15",
    text: "text-success",
  },
  [OrderStatus.PARTIALLY_REFUNDED]: {
    label: "Partially Refunded",
    badge: "bg-destructive/15",
    text: "text-destructive",
  },
  [OrderStatus.FULLY_REFUNDED]: {
    label: "Refunded",
    badge: "bg-destructive/15",
    text: "text-destructive",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelled",
    badge: "bg-destructive/15",
    text: "text-destructive",
  },
};

export const orderStatusStyle = (status: OrderStatus): StatusStyle =>
  ORDER_STATUS_STYLES[status] ?? {
    label: status,
    badge: "bg-muted",
    text: "text-muted-foreground",
  };

const TABLE_STATUS_STYLES: Record<TableStatus, StatusStyle> = {
  [TableStatus.AVAILABLE]: {
    label: "Available",
    badge: "bg-success/15 border-success/40",
    text: "text-success",
  },
  [TableStatus.OCCUPIED]: {
    label: "Occupied",
    badge: "bg-destructive/10 border-destructive/40",
    text: "text-destructive",
  },
  [TableStatus.RESERVED]: {
    label: "Reserved",
    badge: "bg-warning/15 border-warning/40",
    text: "text-warning",
  },
};

export const tableStatusStyle = (status: TableStatus): StatusStyle =>
  TABLE_STATUS_STYLES[status] ?? TABLE_STATUS_STYLES[TableStatus.AVAILABLE];
