import { TableStatus } from "@repo/types";

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
  return new Intl.NumberFormat("en-LB", {
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
