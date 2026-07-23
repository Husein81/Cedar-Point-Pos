import { api } from "../lib/api";

export const tenantApi = {
  updateMyTenant: async (data: Record<string, any>) => {
    const response = await api.put("/tenants/my-tenant", data);
    return response.data;
  },
};
