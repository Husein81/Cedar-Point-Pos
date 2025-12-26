import { create } from "zustand";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type State = {
  cartItems: CartItem[];
};

type Actions = {
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<State & Actions>()((set) => ({
  cartItems: [],
  addItem: (item: CartItem) =>
    set((state) => {
      if (state.cartItems.find((ci) => ci.id === item.id)) {
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.id === item.id
              ? { ...ci, quantity: ci.quantity + item.quantity }
              : ci
          ),
        };
      }
      return { cartItems: [...state.cartItems, item] };
    }),
  removeItem: (itemId: string) =>
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.id !== itemId),
    })),
  clearCart: () => set({ cartItems: [] }),
}));
