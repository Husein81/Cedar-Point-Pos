import { create } from "zustand";
import type { Order } from "@repo/types";

type State = {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
};

type Actions = {
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  setLoading: (isLoading: boolean) => void;
  clearOrders: () => void;
};

export const useKitchenStore = create<State & Actions>()((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,
  setOrders: (orders) => set({ orders }),
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
      selectedOrder:
        state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, status }
          : state.selectedOrder,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  clearOrders: () => set({ orders: [], selectedOrder: null }),
}));
