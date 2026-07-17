import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ModifierGroupItem } from "@/types/modifiers";
import { ModifierType } from "@repo/types";

const MODIFIER_GROUP_QUERY_KEY = ["modifier-groups"];
const MODIFIER_QUERY_KEY = ["modifiers"];

/**
 * ========================================
 * API FUNCTIONS
 * ========================================
 */

export const modifierGroupApi = {
  /**
   * Create a new modifier group
   */
  createModifierGroup: async (data: {
    name: string;
    type: ModifierType;
    productId?: string;
  }): Promise<ModifierGroupItem> => {
    const response = await api.post("/modifier-groups", data);
    return response.data;
  },

  /**
   * Update an existing modifier group
   */
  updateModifierGroup: async (
    groupId: string,
    data: {
      name?: string;
      type?: ModifierType;
      productId?: string;
    },
  ): Promise<ModifierGroupItem> => {
    const response = await api.put(`/modifier-groups/${groupId}`, data);
    return response.data;
  },

  /**
   * Delete a modifier group
   */
  deleteModifierGroup: async (groupId: string): Promise<void> => {
    await api.delete(`/modifier-groups/${groupId}`);
  },
};

/**
 * ========================================
 * MUTATIONS
 * ========================================
 */

/**
 * Create a new modifier group
 */
export const useCreateModifierGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      data: {
        name: string;
        type: ModifierType;
        productId?: string;
      };
    }) => modifierGroupApi.createModifierGroup(data.data),
    onSuccess: () => {
      // Invalidate all modifier-related queries
      queryClient.invalidateQueries({ queryKey: MODIFIER_GROUP_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};

/**
 * Update an existing modifier group
 */
export const useUpdateModifierGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: {
        name?: string;
        type?: ModifierType;
        productId?: string;
      };
    }) => modifierGroupApi.updateModifierGroup(groupId, data),
    onSuccess: () => {
      // Invalidate all modifier-related queries
      queryClient.invalidateQueries({ queryKey: MODIFIER_GROUP_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};

/**
 * Delete a modifier group
 */
export const useDeleteModifierGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) =>
      modifierGroupApi.deleteModifierGroup(groupId),
    onSuccess: () => {
      // Invalidate all modifier-related queries
      queryClient.invalidateQueries({ queryKey: MODIFIER_GROUP_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};
