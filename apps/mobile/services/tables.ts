import { api } from "@/lib/api";
import type { TableOverview } from "@/types";

export const tablesService = {
  getOverview: async (branchId: string): Promise<TableOverview[]> => {
    const response = await api.get<TableOverview[]>(
      `/tables/branch/${branchId}/overview`,
    );
    return response.data;
  },
};
