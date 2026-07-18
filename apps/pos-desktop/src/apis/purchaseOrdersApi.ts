import type {
  CreatePurchaseOrderFormDto,
  PurchaseOrderDetails,
  PurchaseOrderSummary,
} from "@/dto/purchaseOrder.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { api } from "../lib/api";

export const purchaseOrdersApi = {
  getPurchaseOrdersPaginated: async (
    params?: QueryParams & {
      status?: string;
      supplierId?: string;
      branchId?: string;
    },
  ): Promise<PaginationResponse<PurchaseOrderSummary>> => {
    const response = await api.get("/purchase-orders/paginated", { params });
    return response.data;
  },

  getPurchaseOrder: async (id: string): Promise<PurchaseOrderDetails> => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (
    data: CreatePurchaseOrderFormDto,
  ): Promise<PurchaseOrderDetails> => {
    const response = await api.post("/purchase-orders", data);
    return response.data;
  },

  updatePurchaseOrder: async (
    id: string,
    data: { notes?: string; status?: string; orderNumber?: string },
  ): Promise<PurchaseOrderDetails> => {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  },

  receivePurchaseOrder: async (id: string): Promise<PurchaseOrderDetails> => {
    const response = await api.post(`/purchase-orders/${id}/receive`);
    return response.data;
  },

  cancelPurchaseOrder: async (id: string): Promise<PurchaseOrderDetails> => {
    const response = await api.post(`/purchase-orders/${id}/cancel`);
    return response.data;
  },
};
