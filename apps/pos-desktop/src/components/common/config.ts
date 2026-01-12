export type KeypadContext =
  | "QUANTITY"
  | "PRICE_OVERRIDE"
  | "DISCOUNT"
  | "PAYMENT"
  | "SHIPPING"
  | "GUEST_COUNT";

export const KEYPAD_CONFIG: Record<
  KeypadContext,
  {
    label: string;
    minValue: number;
    maxValue: number;
    decimals: number;
    allowZero: boolean;
    step: number;
    confirmLabel: string;
  }
> = {
  QUANTITY: {
    label: "Edit Quantity",
    minValue: 1,
    maxValue: 999,
    decimals: 0,
    allowZero: false,
    step: 1,
    confirmLabel: "Set",
  },
  PRICE_OVERRIDE: {
    label: "Custom Price",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: false,
    step: 0.01,
    confirmLabel: "Apply",
  },
  DISCOUNT: {
    label: "Discount",
    minValue: 0,
    maxValue: 100, // Assuming percentage-based
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Apply",
  },
  PAYMENT: {
    label: "Payment Amount",
    minValue: 0,
    maxValue: 99999.99,
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Confirm",
  },
  SHIPPING: {
    label: "Shipping Fee",
    minValue: 0,
    maxValue: 9999.99,
    decimals: 2,
    allowZero: true,
    step: 0.01,
    confirmLabel: "Set",
  },
  GUEST_COUNT: {
    label: "Guest Count",
    minValue: 1,
    maxValue: 99,
    decimals: 0,
    allowZero: false,
    step: 1,
    confirmLabel: "Set",
  },
};
