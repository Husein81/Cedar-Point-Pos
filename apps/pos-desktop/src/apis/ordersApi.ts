import type { Order, PaginationResponse } from "@repo/types";
import { api } from "./api";
import {
  AddItemDto,
  AssignTableDto,
  CreateOrderDto,
  OrderFilters,
  PaymentDto,
  UpdateItemDiscountDto,
  UpdateOrderDiscountDto,
  UpdateOrderStatusDto,
  UpdateQuantityDto,
} from "@/dto/order.dto";

export const ordersApi = {
  // Create a new order
  createOrder: async (data: CreateOrderDto): Promise<Order> => {
    const response = await api.post<Order>("/orders", data);
    return response.data;
  },

  // Get all orders with filters
  getOrders: async (
    filters?: OrderFilters
  ): Promise<PaginationResponse<Order>> => {
    const response = await api.get("/orders", { params: filters });
    return response.data;
  },

  // Get a specific order
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Process single payment for an order
  processPayment: async (id: string, data: PaymentDto): Promise<Order> => {
    const response = await api.post(`/orders/${id}/payment`, data);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (
    id: string,
    data: UpdateOrderStatusDto
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/status`, data);
    return response.data;
  },

  // Update order discount
  updateOrderDiscount: async (
    id: string,
    data: UpdateOrderDiscountDto
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/discount`, data);
    return response.data;
  },

  // Assign table to order
  assignTableToOrder: async (
    id: string,
    data: AssignTableDto
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/table`, data);
    return response.data;
  },

  // Add item to order
  addItemToOrder: async (id: string, data: AddItemDto): Promise<Order> => {
    const response = await api.post(`/orders/${id}/items`, data);
    return response.data;
  },

  // Update item quantity
  updateItemQuantity: async (
    id: string,
    itemId: string,
    data: UpdateQuantityDto
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/items/${itemId}`, data);
    return response.data;
  },

  // Remove item from order
  removeItemFromOrder: async (id: string, itemId: string): Promise<Order> => {
    const response = await api.delete(`/orders/${id}/items/${itemId}`);
    return response.data;
  },

  // Update item discount
  updateItemDiscount: async (
    id: string,
    itemId: string,
    data: UpdateItemDiscountDto
  ): Promise<Order> => {
    const response = await api.patch(
      `/orders/${id}/items/${itemId}/discount`,
      data
    );
    return response.data;
  },

  // Preview stock deductions
  previewDeductions: async (id: string, branchId: string): Promise<any> => {
    const response = await api.get(`/orders/${id}/preview-deductions`, {
      params: { branchId },
    });
    return response.data;
  },

  // Send order to kitchen
  sendToKitchen: async (id: string): Promise<Order> => {
    const response = await api.post(`/orders/${id}/send-to-kitchen`);
    return response.data;
  },
};
