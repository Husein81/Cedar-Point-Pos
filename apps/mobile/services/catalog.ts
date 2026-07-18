import { api } from "@/lib/api";
import type { Category, Product } from "@/types";

export const catalogService = {
  getProducts: async (branchId?: string): Promise<Product[]> => {
    const response = await api.get<Product[]>("/products", {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },

  /** Fetch categories for the tenant. branchId is included for future scoping
   * but the API currently returns all tenant categories regardless. */
  getCategories: async (
    branchId?: string | null,
    search?: string,
  ): Promise<Category[]> => {
    const response = await api.get<Category[]>("/categories", {
      params: {
        ...(search ? { search } : {}),
        ...(branchId ? { branchId } : {}),
      },
    });
    return response.data;
  },
};
