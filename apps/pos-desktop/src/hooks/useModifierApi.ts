import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Modifier } from "@/types/modifiers";

const MODIFIER_QUERY_KEY = ["modifiers"];

/**
 * ========================================
 * API FUNCTIONS
 * ========================================
 */

export const modifierApi = {
  /**
   * Create a new modifier in a group
   */
  createModifier: async (
    groupId: string,
    data: {
      name: string;
      price: number;
      productIds?: string[];
    },
  ): Promise<Modifier> => {
    const response = await api.post(
      `/modifier-groups/${groupId}/modifiers`,
      data,
    );
    return response.data;
  },

  /**
   * Update an existing modifier
   */
  updateModifier: async (
    groupId: string,
    modifierId: string,
    data: {
      name?: string;
      price?: number;
      productIds?: string[];
    },
  ): Promise<Modifier> => {
    const response = await api.put(
      `/modifier-groups/${groupId}/modifiers/${modifierId}`,
      data,
    );
    return response.data;
  },

  /**
   * Delete a modifier
   */
  deleteModifier: async (
    groupId: string,
    modifierId: string,
  ): Promise<void> => {
    await api.delete(`/modifier-groups/${groupId}/modifiers/${modifierId}`);
  },

  /**
   * Get all modifiers in a group
   */
  getModifiersInGroup: async (groupId: string): Promise<Modifier[]> => {
    const response = await api.get(`/modifier-groups/${groupId}/modifiers`);
    return response.data;
  },
};

/**
 * ========================================
 * MUTATIONS
 * ========================================
 */

/**
 * Create a new modifier
 */
export const useCreateModifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name: string; price: number; productIds?: string[] };
    }) => modifierApi.createModifier(groupId, data),
    onSuccess: () => {
      // Invalidate all modifier queries to refresh lists
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};

/**
 * Update an existing modifier
 */
export const useUpdateModifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      modifierId,
      data,
    }: {
      groupId: string;
      modifierId: string;
      data: { name?: string; price?: number; productIds?: string[] };
    }) => modifierApi.updateModifier(groupId, modifierId, data),
    onSuccess: () => {
      // Invalidate all modifier queries to refresh lists
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};

/**
 * Delete a modifier
 */
export const useDeleteModifier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      modifierId,
    }: {
      groupId: string;
      modifierId: string;
    }) => modifierApi.deleteModifier(groupId, modifierId),
    onSuccess: () => {
      // Invalidate all modifier queries to refresh lists
      queryClient.invalidateQueries({ queryKey: MODIFIER_QUERY_KEY });
    },
  });
};

/**
 * ========================================
 * QUERIES
 * ========================================
 */

/**
 * Get all modifiers in a group
 */
export const useModifiersInGroup = (groupId: string | undefined) => {
  return useQuery<Modifier[]>({
    queryKey: [...MODIFIER_QUERY_KEY, "group", groupId],
    queryFn: () => modifierApi.getModifiersInGroup(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
