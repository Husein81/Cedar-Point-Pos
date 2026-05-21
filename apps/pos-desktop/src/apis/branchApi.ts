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

  createBranch: async (data: Partial<Branch>): Promise<Branch> => {
    const response = await api.post<Branch>("/branches", data);
    return response.data;
  },

  updateBranch: async (id: string, data: Partial<Branch>): Promise<Branch> => {
    const response = await api.post<Branch>(`/branches/${id}`, data);
    return response.data;
  },

  deleteBranch: async (id: string): Promise<void> => {
    await api.delete(`/branches/${id}`);
  },
};
