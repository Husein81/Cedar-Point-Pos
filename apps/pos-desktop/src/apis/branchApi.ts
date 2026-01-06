import type { Branch } from "@repo/types";
import { api } from "./api";

export const branchApi = {
  getBranches: async (): Promise<Branch[]> => {
    const response = await api.get<Branch[]>("/branches");
    return response.data;
  },

  getBranchById: async (id: string): Promise<Branch> => {
    const response = await api.get<Branch>(`/branches/${id}`);
    return response.data;
  },

  getBranchesByTenant: async (tenantId: string): Promise<Branch[]> => {
    const response = await api.get<Branch[]>(`/branches/tenant/${tenantId}`);
    return response.data;
  },
};
