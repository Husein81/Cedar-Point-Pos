import type { KeypadContext } from "@/components/sales/config";
import { create } from "zustand";
import { DiscountType } from "@/shared/enums";

type KeypadState = {
  isOpen: boolean;
  context: KeypadContext;
  currentValue: number;

  itemId?: string;
  itemQuantity?: number;
  itemPrice?: number;
  itemDiscountValue?: number;
  discountType?: DiscountType;
  maxValueOverride?: number;

  onConfirm: ((value: number) => void) | null;
  onPriceChange: ((value: number) => void) | null;
  onDiscountChange: ((value: number, type: DiscountType) => void) | null;

  openKeypad: (params: {
    context?: KeypadContext;
    currentValue: number;
    itemId?: string;
    itemQuantity?: number;
    itemPrice?: number;
    itemDiscountValue?: number;
    discountType?: DiscountType;
    maxValueOverride?: number;
    onConfirm: (value: number) => void;
    onPriceChange?: (value: number) => void;
    onDiscountChange?: (value: number, type: DiscountType) => void;
  }) => void;

  closeKeypad: () => void;
  switchContext: (context: KeypadContext, value?: number) => void;
  updateValue: (value: number) => void;
};

export const useKeypadStore = create<KeypadState>((set, get) => ({
  isOpen: false,
  context: "QUANTITY",
  currentValue: 0,
  itemId: undefined,
  itemQuantity: undefined,
  itemPrice: undefined,
  itemDiscountValue: undefined,
  discountType: DiscountType.PERCENT,
  maxValueOverride: undefined,
  onConfirm: null,
  onPriceChange: null,
  onDiscountChange: null,

  openKeypad: (params) => {
    set({
      isOpen: true,
      context: params.context || "QUANTITY",
      currentValue: params.currentValue,
      itemId: params.itemId,
      itemQuantity: params.itemQuantity,
      itemPrice: params.itemPrice,
      itemDiscountValue: params.itemDiscountValue,
      discountType: params.discountType || DiscountType.PERCENT,
      maxValueOverride: params.maxValueOverride,
      onConfirm: params.onConfirm,
      onPriceChange: params.onPriceChange || null,
      onDiscountChange: params.onDiscountChange || null,
    });
  },

  closeKeypad: () => {
    set({
      isOpen: false,
      context: "QUANTITY",
      currentValue: 0,
      itemId: undefined,
      itemQuantity: undefined,
      itemPrice: undefined,
      itemDiscountValue: undefined,
      discountType: DiscountType.PERCENT,
      maxValueOverride: undefined,
      onConfirm: null,
      onPriceChange: null,
      onDiscountChange: null,
    });
  },

  switchContext: (context, value) => {
    const state = get();
    let newValue = value;

    if (newValue === undefined) {
      if (context === "QUANTITY") {
        newValue = state.itemQuantity ?? 1;
      } else if (context === "PRICE_OVERRIDE") {
        newValue = state.itemPrice ?? 0;
      } else if (context === "DISCOUNT_PERCENT" || context === "DISCOUNT_FIXED") {
        newValue = state.itemDiscountValue ?? 0;
      } else {
        newValue = state.currentValue;
      }
    }

    set({ context, currentValue: newValue });
  },

  updateValue: (value) => set({ currentValue: value }),
}));
