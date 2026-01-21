import { KeypadContext } from "@/components/orders/config";
import { create } from "zustand";

type KeypadState = {
  // Core state
  isOpen: boolean;
  context: KeypadContext;
  currentValue: number;

  // Context-specific data
  itemId?: string; // ID of the cart item being edited
  itemQuantity?: number; // Original item quantity
  itemPrice?: number; // Original item price
  itemDiscountValue?: number; // Current discount value
  discountType?: "PERCENTAGE" | "FIXED";
  maxValueOverride?: number; // For dynamic max (e.g., DISCOUNT_FIXED capped at subtotal)

  // Callbacks
  onConfirm: ((value: number) => void) | null;
  onPriceChange: ((value: number) => void) | null;
  onDiscountChange:
    | ((value: number, type: "PERCENTAGE" | "FIXED") => void)
    | null;
  onPermissionRequired?: ((context: KeypadContext) => Promise<boolean>) | null;

  // Actions
  openKeypad: (params: {
    context?: KeypadContext;
    currentValue: number;
    itemId?: string;
    itemQuantity?: number;
    itemPrice?: number;
    itemDiscountValue?: number;
    discountType?: "PERCENTAGE" | "FIXED";
    maxValueOverride?: number; // Optional dynamic max value
    onConfirm: (value: number) => void;
    onPriceChange?: (value: number) => void;
    onDiscountChange?: (value: number, type: "PERCENTAGE" | "FIXED") => void;
    onPermissionRequired?: (context: KeypadContext) => Promise<boolean>;
  }) => void;

  closeKeypad: () => void;

  // Switch context while keeping keypad open (for Qty/Price/% buttons)
  switchContext: (context: KeypadContext, value?: number) => void;

  updateDiscountType: (type: "PERCENTAGE" | "FIXED") => void;

  updateValue: (value: number) => void;
};

export const useKeypadStore = create<KeypadState>((set, get) => ({
  // Initial state
  isOpen: false,
  context: "QUANTITY",
  currentValue: 0,
  itemId: undefined,
  itemQuantity: undefined,
  itemPrice: undefined,
  itemDiscountValue: undefined,
  discountType: "PERCENTAGE",
  maxValueOverride: undefined,
  onConfirm: null,
  onPriceChange: null,
  onDiscountChange: null,
  onPermissionRequired: undefined,

  // Open keypad with all necessary context
  openKeypad: (params) => {
    set({
      isOpen: true,
      context: params.context || "QUANTITY",
      currentValue: params.currentValue,
      itemId: params.itemId,
      itemQuantity: params.itemQuantity,
      itemPrice: params.itemPrice,
      itemDiscountValue: params.itemDiscountValue,
      discountType: params.discountType || "PERCENTAGE",
      maxValueOverride: params.maxValueOverride,
      onConfirm: params.onConfirm,
      onPriceChange: params.onPriceChange || null,
      onDiscountChange: params.onDiscountChange || null,
      onPermissionRequired: params.onPermissionRequired,
    });
  },

  // Close keypad and reset state
  closeKeypad: () => {
    set({
      isOpen: false,
      context: "QUANTITY",
      currentValue: 0,
      itemId: undefined,
      itemQuantity: undefined,
      itemPrice: undefined,
      itemDiscountValue: undefined,
      discountType: "PERCENTAGE",
      maxValueOverride: undefined,
      onConfirm: null,
      onPriceChange: null,
      onDiscountChange: null,
      onPermissionRequired: undefined,
    });
  },

  // Switch context while keeping keypad open - auto-load context values
  switchContext: (context, value) => {
    const state = get();
    let newValue = value;

    // If no explicit value provided, use context-appropriate value
    if (newValue === undefined) {
      if (context === "QUANTITY") {
        newValue = state.itemQuantity ?? 1;
      } else if (context === "PRICE_OVERRIDE") {
        newValue = state.itemPrice ?? 0;
      } else if (
        context === "DISCOUNT" ||
        context === "DISCOUNT_PERCENT" ||
        context === "DISCOUNT_FIXED"
      ) {
        newValue = state.itemDiscountValue ?? 0;
      } else {
        newValue = state.currentValue;
      }
    }

    set({
      context,
      currentValue: newValue,
    });
  },

  // Update discount type (used by discount keypad)
  updateDiscountType: (type) => {
    set({ discountType: type });
  },

  // Update current value
  updateValue: (value) => {
    set({ currentValue: value });
  },
}));
