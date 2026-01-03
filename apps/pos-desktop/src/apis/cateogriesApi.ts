import type { Category, PaginationResponse, QueryParams } from "@repo/types";
import { api } from "./api";

export const categoriesApi = {
  getAll: async ({
    params,
  }: {
    params: QueryParams;
  }): Promise<PaginationResponse<Category>> => {
    const response = await api.get("/categories", {
      params,
    });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },
};
