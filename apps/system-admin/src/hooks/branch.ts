import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { branchApi } from "@/apis/branchApi";
import { CreateBranchPayload, UpdateBranchPayload } from "@/dto/branch.dto";
import { tenantKeys } from "./tenant";

export const branchKeys = {
  byTenant: (tenantId: string) => ["branches", "tenant", tenantId] as const,
};

/**
 * Fetch branches for a tenant
 */
export const useTenantBranches = (tenantId: string) => {
  return useQuery({
    queryKey: branchKeys.byTenant(tenantId),
    queryFn: () => branchApi.getByTenantId(tenantId),
    enabled: !!tenantId,
  });
};

/**
 * Create a branch for a tenant
 */
export const useCreateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      payload,
    }: {
      tenantId: string;
      payload: CreateBranchPayload;
    }) => branchApi.create(tenantId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: branchKeys.byTenant(variables.tenantId),
      });
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
};

/**
 * Update a branch
 */
export const useUpdateBranch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      tenantId,
      payload,
    }: {
      id: string;
      tenantId: string;
      payload: UpdateBranchPayload;
    }) => branchApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: branchKeys.byTenant(variables.tenantId),
      });
    },
  });
};
