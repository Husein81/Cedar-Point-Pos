import { api } from "@/lib/api";
import type { Branch } from "@/types";

export const branchesService = {
  getAll: async (): Promise<Branch[]> => {
    const response = await api.get<Branch[]>("/branches");
    return response.data;
  },
};
