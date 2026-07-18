import { OrderType } from "@repo/types";
import { create } from "zustand";

/** Must stay in sync with VAT_RATE in the API's OrdersService and the POS
 * orderStore (see CLAUDE.md §9). Display-only — the server recomputes
 * authoritative totals when the order is created. */
export const VAT_RATE = 0.11;

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
}

interface CartState {
  orderType: OrderType;
  tableId: string | null;
  tableName: string | null;
  guestCount: number;
  includeVAT: boolean;
  items: CartItem[];
  startOrder: (params: {
    orderType: OrderType;
    tableId?: string;
    tableName?: string;
  }) => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNotes: (productId: string, notes: string) => void;
  removeItem: (productId: string) => void;
  setGuestCount: (guestCount: number) => void;
  toggleVAT: () => void;
  clear: () => void;
}

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const useCartStore = create<CartState>((set) => ({
  orderType: OrderType.DINE_IN,
  tableId: null,
  tableName: null,
  guestCount: 1,
  includeVAT: false,
  items: [],

  startOrder: ({ orderType, tableId, tableName }) =>
    set({
      orderType,
      tableId: tableId ?? null,
      tableName: tableName ?? null,
      guestCount: 1,
      items: [],
    }),

  addItem: (item, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity }] };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) =>
              i.productId === productId ? { ...i, quantity } : i,
            ),
    })),

  setNotes: (productId, notes) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, notes } : i,
      ),
    })),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  setGuestCount: (guestCount) => set({ guestCount: Math.max(1, guestCount) }),

  toggleVAT: () => set((state) => ({ includeVAT: !state.includeVAT })),

  clear: () =>
    set({
      tableId: null,
      tableName: null,
      guestCount: 1,
      items: [],
      orderType: OrderType.DINE_IN,
    }),
}));

export const selectCartCount = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartSubtotal = (state: CartState): number =>
  round(
    state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

export const selectCartVat = (state: CartState): number =>
  state.includeVAT ? round(selectCartSubtotal(state) * VAT_RATE) : 0;

export const selectCartTotal = (state: CartState): number =>
  round(selectCartSubtotal(state) + selectCartVat(state));
