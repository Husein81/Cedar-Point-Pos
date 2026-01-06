import {
  CreateTenantPayload,
  CreateUserPayload,
  TenantUser,
  TenantWithCount,
} from "@/dto/tenant.dto";
import { api } from "./api";

export const tenantApi = {
  /**
   * Get all tenants with user counts
   */
  getAll: async (): Promise<TenantWithCount[]> => {
    return api("/tenants");
  },

  /**
   * Get a single tenant by ID
   */
  getById: async (id: string): Promise<TenantWithCount> => {
    return api(`/tenants/${id}`);
  },

  /**
   * Get all users for a tenant
   */
  getUsers: async (tenantId: string): Promise<TenantUser[]> => {
    return api(`/tenants/${tenantId}/users`);
  },

  /**
   * Create a new tenant
   */
  create: async (payload: CreateTenantPayload): Promise<TenantWithCount> => {
    return api("/tenants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete a tenant (only if no dependent data)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return api(`/tenants/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Create a user within a tenant
   */
  createUser: async (payload: CreateUserPayload): Promise<TenantUser> => {
    return api("/auth/create-user", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
