import {
  Branch,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "@/dto/branch.dto";
import { api } from "./api";

export const branchApi = {
  /**
   * Get all branches for a tenant
   */
  getByTenantId: async (tenantId: string): Promise<Branch[]> => {
    return api(`/branches/tenant/${tenantId}`);
  },

  /**
   * Create a branch for a tenant (system admin only)
   */
  create: async (
    tenantId: string,
    payload: CreateBranchPayload
  ): Promise<Branch> => {
    return api(`/branches/tenant/${tenantId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update a branch
   */
  update: async (id: string, payload: UpdateBranchPayload): Promise<Branch> => {
    return api(`/branches/${id}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
