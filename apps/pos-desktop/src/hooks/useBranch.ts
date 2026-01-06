import { useQuery } from "@tanstack/react-query";
import { branchApi } from "../apis/branchApi";
import type { Branch } from "@repo/types";

const BRANCH_QUERY_KEY = ["branches"];

export const useBranches = () => {
  return useQuery<Branch[]>({
    queryKey: BRANCH_QUERY_KEY,
    queryFn: () => branchApi.getBranches(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBranchesByTenant = (tenantId: string | null | undefined) => {
  return useQuery<Branch[]>({
    queryKey: [...BRANCH_QUERY_KEY, "tenant", tenantId],
    queryFn: () => branchApi.getBranchesByTenant(tenantId!),
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useBranch = (id: string) => {
  return useQuery<Branch>({
    queryKey: [...BRANCH_QUERY_KEY, id],
    queryFn: () => branchApi.getBranchById(id),
    enabled: !!id,
  });
};
