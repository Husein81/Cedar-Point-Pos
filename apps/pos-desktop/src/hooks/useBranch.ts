import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { branchApi } from "../apis/branchApi";
import type { Branch } from "@repo/types";

const BRANCH_QUERY_KEY = ["branches"];

export const useBranches = (): UseQueryResult<Branch[], Error> => {
  return useQuery<Branch[]>({
    queryKey: BRANCH_QUERY_KEY,
    queryFn: () => branchApi.getBranches(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days — kept for offline use
    networkMode: "offlineFirst",
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
