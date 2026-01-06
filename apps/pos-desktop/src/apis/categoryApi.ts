import type { Category, QueryParams } from "@repo/types";
import { api } from "./api";

export interface CreateCategoryDto {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  code?: string;
  description?: string;
}

export interface CategoryWithSubcategories extends Category {
  subcategories?: Array<{
    id: string;
    categoryId: string;
    name: string;
    description?: string | null;
    isDeleted: boolean;
  }> | null;
}

export const categoryApi = {
  getCategories: async (params?: QueryParams): Promise<Category[]> => {
    const response = await api.get("/categories", { params });
    return response.data;
  },

  getCategory: async (id: string): Promise<CategoryWithSubcategories> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await api.post("/categories", data);
    return response.data;
  },

  updateCategory: async (
    id: string,
    data: UpdateCategoryDto
  ): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
