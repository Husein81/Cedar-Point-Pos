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
    allowZero: false,
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
