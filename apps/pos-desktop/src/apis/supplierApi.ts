import type {
  CreateSupplierDto,
  SupplierDetails,
  SupplierFullDetails,
  SupplierPurchaseOrder,
  SupplierSummary,
  UpdateSupplierDto,
} from "@/dto/supplier.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { api } from "./api";

export const supplierApi = {
  /**
   * Search suppliers by name, company, or phone (autocomplete)
   */
  searchSuppliers: async (
    query: string,
    limit: number = 10
  ): Promise<SupplierSummary[]> => {
    const response = await api.get("/suppliers/search", {
      params: { query, limit },
    });
    return response.data;
  },

  /**
   * Get suppliers with pagination, sorting and filtering
   */
  getSuppliersPaginated: async (
    params?: QueryParams
  ): Promise<PaginationResponse<SupplierDetails>> => {
    const response = await api.get("/suppliers/paginated", {
      params,
    });
    return response.data;
  },

  /**
   * Get supplier full details by ID (with operational stats)
   */
  getSupplier: async (id: string): Promise<SupplierFullDetails> => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  /**
   * Get supplier purchase orders with pagination
   */
  getSupplierPurchaseOrders: async (
    id: string,
    params?: QueryParams
  ): Promise<PaginationResponse<SupplierPurchaseOrder>> => {
    const response = await api.get(`/suppliers/${id}/purchase-orders`, {
      params,
    });
    return response.data;
  },

  /**
   * Create a new supplier
   */
  createSupplier: async (
    data: CreateSupplierDto
  ): Promise<SupplierSummary> => {
    const response = await api.post("/suppliers", data);
    return response.data;
  },

  /**
   * Update an existing supplier
   */
  updateSupplier: async (
    id: string,
    data: UpdateSupplierDto
  ): Promise<SupplierDetails> => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a supplier (soft delete)
   */
  deleteSupplier: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};
