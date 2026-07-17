import type { Order, OrderStatus, PaginationResponse } from "@repo/types";
import { api } from "../lib/api";

type Params = {
  branchId?: string;
  page?: string;
  limit?: string;
};

export const kitchenApi = {
  getOrders: async ({
    branchId,
    page,
    limit,
  }: Params): Promise<PaginationResponse<Order>> => {
    const params = branchId ? { branchId, page, limit } : { page, limit };
    const response = await api.get("/kitchen/orders", { params });
    return response.data;
  },

  getOrderById: async (orderId: string): Promise<Order> => {
    const response = await api.get(`/kitchen/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (
    orderId: string,
    status: OrderStatus,
  ): Promise<Order> => {
    const response = await api.put(`/kitchen/orders/${orderId}/status`, {
      status,
    });
    return response.data;
  },

  updateTicketStatus: async (ticketId: string, status: string) => {
    const response = await api.put(`/kitchen/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },
};
