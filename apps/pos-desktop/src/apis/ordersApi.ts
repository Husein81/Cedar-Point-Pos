import type { Order, PaginationResponse } from "@repo/types";
import { api } from "./api";
import {
  AddItemDto,
  AssignTableDto,
  CreateOrderDto,
  type LoyaltyRedemptionPayload,
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
    filters?: OrderFilters,
  ): Promise<PaginationResponse<Order>> => {
    const response = await api.get("/orders", { params: filters });
    return response.data;
  },

  // Get a specific order
  getOrder: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Process single or batch payment for an order
  processPayment: async (
    id: string,
    data:
      | PaymentDto[]
      | PaymentDto
      | { payments: PaymentDto[]; loyalty?: LoyaltyRedemptionPayload },
  ): Promise<Order> => {
    const response = await api.post(`/orders/${id}/payment`, data);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (
    id: string,
    data: UpdateOrderStatusDto,
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/status`, data);
    return response.data;
  },

  // Update order discount
  updateOrderDiscount: async (
    id: string,
    data: UpdateOrderDiscountDto,
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/discount`, data);
    return response.data;
  },

  // Assign table to order
  assignTableToOrder: async (
    id: string,
    data: AssignTableDto,
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/table`, data);
    return response.data;
  },

  // Add item to order
  addItemToOrder: async (id: string, data: AddItemDto): Promise<Order> => {
    const response = await api.post(`/orders/${id}/items`, data);
    return response.data;
  },

  // Batch add items to order
  batchAddItemsToOrder: async (
    id: string,
    items: AddItemDto[],
  ): Promise<Order> => {
    const response = await api.post(`/orders/${id}/batch-items`, items);
    return response.data;
  },

  // Update item quantity
  updateItemQuantity: async (
    id: string,
    itemId: string,
    data: UpdateQuantityDto,
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
    data: UpdateItemDiscountDto,
  ): Promise<Order> => {
    const response = await api.patch(
      `/orders/${id}/items/${itemId}/discount`,
      data,
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

  // Get active (unpaid) order for a specific table
  getActiveOrderByTableId: async (tableId: string): Promise<Order | null> => {
    const response = await api.get(`/orders/table/${tableId}/active`);
    return response.data;
  },

  // Transfer order to a different table (optionally merge into existing order)
  transferOrderToTable: async (
    id: string,
    targetTableId: string,
    mergeIntoOrderId?: string,
  ): Promise<Order> => {
    const response = await api.patch(`/orders/${id}/transfer-table`, {
      targetTableId,
      ...(mergeIntoOrderId ? { mergeIntoOrderId } : {}),
    });
    return response.data;
  },

  // Split selected item quantities into a new order on the same table
  splitOrder: async (
    id: string,
    items: { itemId: string; quantity: number }[],
  ): Promise<{ originalOrder: Order; newOrder: Order }> => {
    const response = await api.post(`/orders/${id}/split`, { items });
    return response.data;
  },

  // Merge source order into target order (same table)
  mergeOrders: async (
    targetOrderId: string,
    sourceOrderId: string,
  ): Promise<Order> => {
    const response = await api.post(`/orders/${targetOrderId}/merge`, {
      sourceOrderId,
    });
    return response.data;
  },

  // Get next available order number
  getNextOrderNumber: async (
    branchId: string,
  ): Promise<{ orderNumber: string }> => {
    const response = await api.get("/orders/next-number", {
      params: { branchId },
    });
    return response.data;
  },
};
