import type { Order } from "@repo/types";
import { api } from "./api";

export const kitchenApi = {
  getOrders: async (branchId?: string): Promise<Order[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get("/kitchen/orders", { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get(`/kitchen/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (
    orderId: string,
    status: string,
  ): Promise<Order> => {
    const response = await api.patch(`/kitchen/orders/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  updateTicketStatus: async (ticketId: string, status: string) => {
    const response = await api.patch(`/kitchen/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },
};
