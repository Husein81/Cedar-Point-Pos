import type {
  AddPurchaseOrderItemDto,
  CreatePurchaseOrderDto,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderSummary,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderItemDto,
} from "@/dto/purchaseOrder.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { api } from "./api";

export const purchaseOrderApi = {
  /**
   * Get paginated list of purchase orders
   */
  getPurchaseOrders: async (
    params?: QueryParams & {
      status?: string;
      supplierId?: string;
      branchId?: string;
    }
  ): Promise<PaginationResponse<PurchaseOrderSummary>> => {
    const response = await api.get("/purchase-orders", { params });
    return response.data;
  },

  /**
   * Get a single purchase order by ID
   */
  getPurchaseOrder: async (id: string): Promise<PurchaseOrderDetail> => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  /**
   * Create a new purchase order with items
   */
  createPurchaseOrder: async (
    data: CreatePurchaseOrderDto
  ): Promise<PurchaseOrderDetail> => {
    const response = await api.post("/purchase-orders", data);
    return response.data;
  },

  /**
   * Update PO metadata (notes, orderNumber)
   */
  updatePurchaseOrder: async (
    id: string,
    data: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrderDetail> => {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  },

  /**
   * Delete a PENDING purchase order
   */
  deletePurchaseOrder: async (id: string): Promise<void> => {
    await api.delete(`/purchase-orders/${id}`);
  },

  /**
   * Transition PO from PENDING → ORDERED
   */
  orderPurchaseOrder: async (id: string): Promise<PurchaseOrderDetail> => {
    const response = await api.post(`/purchase-orders/${id}/order`);
    return response.data;
  },

  /**
   * Mark PO as received and update inventory
   */
  receivePurchaseOrder: async (id: string): Promise<PurchaseOrderDetail> => {
    const response = await api.post(`/purchase-orders/${id}/receive`);
    return response.data;
  },

  /**
   * Cancel a purchase order
   */
  cancelPurchaseOrder: async (id: string): Promise<PurchaseOrderDetail> => {
    const response = await api.post(`/purchase-orders/${id}/cancel`);
    return response.data;
  },

  // ─── Item Management ───

  /**
   * Add an item to a PENDING purchase order
   */
  addItem: async (
    purchaseOrderId: string,
    data: AddPurchaseOrderItemDto
  ): Promise<PurchaseOrderItem> => {
    const response = await api.post(
      `/purchase-orders/${purchaseOrderId}/items`,
      data
    );
    return response.data;
  },

  /**
   * Update an item on a PENDING purchase order
   */
  updateItem: async (
    purchaseOrderId: string,
    itemId: string,
    data: UpdatePurchaseOrderItemDto
  ): Promise<PurchaseOrderItem> => {
    const response = await api.patch(
      `/purchase-orders/${purchaseOrderId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove an item from a PENDING purchase order
   */
  removeItem: async (
    purchaseOrderId: string,
    itemId: string
  ): Promise<void> => {
    await api.delete(
      `/purchase-orders/${purchaseOrderId}/items/${itemId}`
    );
  },
};
