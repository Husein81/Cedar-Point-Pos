import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/apis/tenantApi";
import { CreateTenantPayload, CreateUserPayload } from "@/dto/tenant.dto";

export const tenantKeys = {
  all: ["tenants"] as const,
  detail: (id: string) => ["tenants", id] as const,
  users: (tenantId: string) => ["tenants", tenantId, "users"] as const,
};

/**
 * Fetch all tenants with user counts
 */
export const useTenants = () => {
  return useQuery({
    queryKey: tenantKeys.all,
    queryFn: () => tenantApi.getAll(),
  });
};

/**
 * Fetch a single tenant by ID
 */
export const useTenant = (id: string) => {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: () => tenantApi.getById(id),
    enabled: !!id,
  });
};

/**
 * Fetch users for a specific tenant
 */
export const useTenantUsers = (tenantId: string) => {
  return useQuery({
    queryKey: tenantKeys.users(tenantId),
    queryFn: () => tenantApi.getUsers(tenantId),
    enabled: !!tenantId,
  });
};

/**
 * Create a new tenant
 */
export const useCreateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => tenantApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
};

/**
 * Delete a tenant
 */
export const useDeleteTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenantApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
};

/**
 * Create a user within a tenant
 */
export const useCreateTenantUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => tenantApi.createUser(payload),
    onSuccess: (_, variables) => {
      // Invalidate both the tenant users list and the tenants list (for user count)
      queryClient.invalidateQueries({
        queryKey: tenantKeys.users(variables.tenantId),
      });
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
};
