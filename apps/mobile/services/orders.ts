import type { OrderStatus, OrderType } from "@repo/types";
import { api } from "@/lib/api";
import type { Order, PaginatedOrders } from "@/types";

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  branchId?: string;
  type?: OrderType;
  startDate?: string;
  endDate?: string;
  tableId?: string;
  search?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  branchId: string;
  type: OrderType;
  tableId?: string;
  guestCount?: number;
  includeVAT?: boolean;
  items?: CreateOrderItemInput[];
}

export const ordersService = {
  create: async (data: CreateOrderInput): Promise<Order> => {
    const response = await api.post<Order>("/orders", data);
    return response.data;
  },

  getAll: async (filters?: OrderFilters): Promise<PaginatedOrders> => {
    const response = await api.get<PaginatedOrders>("/orders", {
      params: filters,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  },

  getActiveByTable: async (tableId: string): Promise<Order | null> => {
    const response = await api.get<Order | null>(
      `/orders/table/${tableId}/active`,
    );
    return response.data;
  },

  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    const response = await api.patch<Order>(`/orders/${id}/status`, {
      status,
    });
    return response.data;
  },

  sendToKitchen: async (id: string): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/send-to-kitchen`);
    return response.data;
  },

  addItem: async (
    id: string,
    item: CreateOrderItemInput,
  ): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/items`, item);
    return response.data;
  },

  batchAddItems: async (
    id: string,
    items: CreateOrderItemInput[],
  ): Promise<Order> => {
    const response = await api.post<Order>(`/orders/${id}/batch-items`, items);
    return response.data;
  },

  updateItemQuantity: async (
    id: string,
    itemId: string,
    quantity: number,
  ): Promise<Order> => {
    const response = await api.patch<Order>(`/orders/${id}/items/${itemId}`, {
      quantity,
    });
    return response.data;
  },

  removeItem: async (id: string, itemId: string): Promise<Order> => {
    const response = await api.delete<Order>(`/orders/${id}/items/${itemId}`);
    return response.data;
  },
};
