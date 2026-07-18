import { OrderStatus, TableStatus } from "@repo/types";
import { DEFAULT_LOCALE } from "@/constants/locale";

export type KeypadContext =
  | "QUANTITY"
  | "PRICE_OVERRIDE"
  | "DISCOUNT"
  | "DISCOUNT_PERCENT"
  | "DISCOUNT_FIXED"
  | "PAYMENT"
  | "SHIPPING"
  | "GUEST_COUNT"
  | undefined;

export const KEYPAD_CONFIG: Record<
  Exclude<KeypadContext, undefined>,
  {
    label: string;
    minValue: number;
    maxValue: number;
    decimals: number;
    allowZero: boolean;
    step: number;
    confirmLabel: string;
    requiresPermission?: boolean;
  }
> = {
  QUANTITY: {
    label: "Edit Quantity",
    minValue: 0,
    maxValue: 999,
    decimals: 0,
    allowZero: true,
    step: 1,
    confirmLabel: "Set",
    requiresPermission: false,
  },
  PRICE_OVERRIDE: {
    label: "Custom Price",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: false,
    step: 0.01,
    confirmLabel: "Apply",
    requiresPermission: true, // Requires manager permission
  },
  DISCOUNT: {
    label: "Discount",
    minValue: 0,
    maxValue: 100, // Percentage by default
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Apply",
    requiresPermission: false,
  },
  DISCOUNT_PERCENT: {
    label: "Discount (%)",
    minValue: 0,
    maxValue: 100,
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Apply",
    requiresPermission: false,
  },
  DISCOUNT_FIXED: {
    label: "Discount (Fixed)",
    minValue: 0,
    maxValue: 99999.99, // Should be capped at order subtotal
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Apply",
    requiresPermission: false,
  },
  PAYMENT: {
    label: "Payment Amount",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Confirm",
    requiresPermission: false,
  },
  SHIPPING: {
    label: "Shipping Fee",
    minValue: 0,
    maxValue: 9999.99,
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Set",
    requiresPermission: false,
  },
  GUEST_COUNT: {
    label: "Guest Count",
    minValue: 1,
    maxValue: 99,
    decimals: 0,
    allowZero: false,
    step: 1,
    confirmLabel: "Set",
    requiresPermission: false,
  },
};

export type StatusFilter = "ALL" | TableStatus;

export const STATUS_CONFIG: Record<
  TableStatus,
  { label: string; color: string; bgClass: string; icon: string }
> = {
  AVAILABLE: {
    label: "Available",
    color: "text-emerald-500",
    bgClass: "bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-400",
    icon: "CircleCheck",
  },
  OCCUPIED: {
    label: "Occupied",
    color: "text-red-500",
    bgClass: "bg-red-500/10 border-red-500/50 hover:border-red-400",
    icon: "Users",
  },
  RESERVED: {
    label: "Reserved",
    color: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/50 hover:border-amber-400",
    icon: "Clock",
  },
};

export const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RESERVED", label: "Reserved" },
];

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "N/A";
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "decimal",
  }).format(price);
};

export const generateQuickCashAmounts = (total: number) => {
  const results = new Set<number>();

  const roundedTo1 = Math.ceil(total);
  results.add(roundedTo1);
  results.add(Math.ceil(total / 5) * 5);
  results.add(Math.ceil(total / 10) * 10);
  results.add(Math.ceil(total / 20) * 20);
  results.add(Math.ceil(total / 50) * 50);
  results.add(Math.ceil(total / 100) * 100);

  return Array.from(results)
    .filter((v) => v > total)
    .sort((a, b) => a - b)
    .slice(0, 6);
};

export const ONGOING_STATUSES: OrderStatus[] = [
  "DRAFT",
  "PLACED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
];

export const STATUS_FILTER_OPTIONS = [
  { label: "All Ongoing", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Placed", value: "PLACED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY" },
  { label: "Served", value: "SERVED" },
  { label: "Completed", value: "COMPLETED" },
];

export const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  PLACED: {
    label: "Placed",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  PREPARING: {
    label: "Preparing",
    className:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  },
  READY: {
    label: "Ready",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  SERVED: {
    label: "Served",
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-green-200 text-gray-800 dark:bg-green-700 dark:text-gray-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

export const PAYMENT_BADGE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};
