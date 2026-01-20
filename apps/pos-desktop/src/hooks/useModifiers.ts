import { useQuery } from "@tanstack/react-query";
import { api } from "@/apis/api";
import { ModifierGroup, ModifierGroupItem } from "@/types/modifiers";
import { PaginationResponse } from "@repo/types";

const MODIFIER_QUERY_KEY = ["modifiers"];

/**
 * ========================================
 * API FUNCTIONS
 * ========================================
 */
export const modifiersApi = {
  getModifiersByProduct: async (productId: string): Promise<ModifierGroup> => {
    const response = await api.get(`/products/${productId}/modifiers`);
    return response.data;
  },

  getAllModifierGroups: async (): Promise<
    PaginationResponse<ModifierGroupItem>
  > => {
    const response = await api.get("/modifier-groups");
    return response.data;
  },
};

export const useProductModifiers = (productId: string, enabled = true) => {
  return useQuery<ModifierGroup>({
    queryKey: [...MODIFIER_QUERY_KEY, "product", productId],
    queryFn: () => modifiersApi.getModifiersByProduct(productId),
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch all modifier groups (for admin/management screens)
 */
export const useAllModifierGroups = () => {
  return useQuery({
    queryKey: [...MODIFIER_QUERY_KEY, "all"],
    queryFn: modifiersApi.getAllModifierGroups,
    staleTime: 5 * 60 * 1000,
  });
};
