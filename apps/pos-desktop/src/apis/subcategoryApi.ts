import type { Subcategory } from "@repo/types";
import { api } from "../lib/api";
import { CreateSubcategoryDto, UpdateSubcategoryDto } from "@/dto/category.dto";

export const subcategoryApi = {
  createSubcategory: async (
    categoryId: string,
    data: CreateSubcategoryDto,
  ): Promise<Subcategory> => {
    const response = await api.post<Subcategory>(
      `/categories/${categoryId}/subcategories`,
      data,
    );
    return response.data;
  },

  updateSubcategory: async (
    id: string,
    data: UpdateSubcategoryDto,
  ): Promise<Subcategory> => {
    const response = await api.put<Subcategory>(`/subcategories/${id}`, data);
    return response.data;
  },

  deleteSubcategory: async (id: string): Promise<void> => {
    await api.delete(`/subcategories/${id}`);
  },
};
