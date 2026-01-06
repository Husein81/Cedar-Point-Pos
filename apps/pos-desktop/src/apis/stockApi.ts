import {
  AdjustmentHistoryQuery,
  AdjustmentType,
  InventoryWithProduct,
  PaginatedInventoryResponse,
  StockAdjustmentDto,
} from "@/dto/inventory.dto";
import type {
  Inventory,
  InventoryHistory,
  PaginationResponse,
  QueryParams,
} from "@repo/types";
import { api } from "./api";

export const stockApi = {
  // Get all inventory for a branch
  getInventoryByBranch: async (
    branchId: string,
    params?: QueryParams
  ): Promise<PaginatedInventoryResponse> => {
    const response = await api.get<PaginatedInventoryResponse>(
      `/inventory/${branchId}`,
      { params }
    );
    return response.data;
  },

  // Get specific inventory item
  getInventoryItem: async (
    branchId: string,
    productId: string
  ): Promise<InventoryWithProduct> => {
    const response = await api.get<InventoryWithProduct>(
      `/inventory/${branchId}/product/${productId}`
    );
    return response.data;
  },

  // Adjust stock (add/remove/set)
  adjustStock: async (data: StockAdjustmentDto) => {
    try {
      // Call the new stock adjustment endpoint
      const response = await api.post("/inventory/adjustments", {
        branchId: data.branchId,
        productId: data.productId,
        adjustmentType: data.adjustmentType,
        quantity: data.quantity,
        reason: data.reason,
        minStock: data.minStock,
      });
      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (typeof error === "object" && error !== null && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw error;
    }
  },

  // Set minimum stock threshold
  setMinStock: async (
    branchId: string,
    productId: string,
    minStock: number,
    reason?: string
  ): Promise<Inventory> => {
    const response = await api.put<Inventory>(
      `/inventory/${branchId}/product/${productId}/min-stock`,
      {
        minStock,
        reason: reason || "Minimum stock threshold updated",
      }
    );
    return response.data;
  },

  // Validate stock adjustment before applying
  validateStockAdjustment: async (
    branchId: string,
    productId: string,
    quantity: number,
    adjustmentType: AdjustmentType
  ): Promise<{ valid: boolean; currentStock: number; message?: string }> => {
    try {
      const inventory = await stockApi.getInventoryItem(branchId, productId);
      const currentStock = Number(inventory.stock);

      if (adjustmentType === "STOCK_OUT") {
        // quantity is always positive, we're checking if we can remove that amount
        if (currentStock < quantity) {
          return {
            valid: false,
            currentStock,
            message: `Cannot remove ${quantity} units. Only ${currentStock} units available in stock.`,
          };
        }
      }

      return { valid: true, currentStock };
    } catch (error) {
      return {
        valid: false,
        currentStock: 0,
        message: "Could not fetch current stock level.",
      };
    }
  },

  // Get adjustment history
  getAdjustmentHistory: async (
    query: AdjustmentHistoryQuery
  ): Promise<PaginationResponse<InventoryHistory>> => {
    const response = await api.get("/inventory/adjustments", {
      params: query,
    });
    return response.data;
  },

  // Get inventory history by branch
  getInventoryHistoryByBranch: async (
    branchId: string,
    params?: {
      page?: number;
      limit?: number;
      productId?: string;
    }
  ): Promise<
    PaginationResponse<
      InventoryHistory & {
        product?: { name: string; sku: string | null };
        user?: { name: string; username: string };
      }
    >
  > => {
    const response = await api.get(`/inventory/${branchId}/history`, {
      params,
    });
    return response.data;
  },

  // Get low stock items
  getLowStock: async (
    branchId?: string
  ): Promise<PaginatedInventoryResponse> => {
    const response = await api.get<PaginatedInventoryResponse>(
      "/inventory/low-stock",
      {
        params: { branchId, limit: 1000 },
      }
    );
    return response.data;
  },
};
