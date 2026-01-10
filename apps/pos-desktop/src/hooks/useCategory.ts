import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoryApi,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryWithSubcategories,
} from "../apis/categoryApi";
import type { QueryParams } from "@repo/types";

const CATEGORY_QUERY_KEY = ["categories"];

export const useCategories = (params?: QueryParams) => {
  return useQuery<CategoryWithSubcategories[]>({
    queryKey: [...CATEGORY_QUERY_KEY, params],
    queryFn: () => categoryApi.getCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategory = (id: string) => {
  return useQuery<CategoryWithSubcategories>({
    queryKey: [...CATEGORY_QUERY_KEY, id],
    queryFn: () => categoryApi.getCategory(id),
    enabled: !!id,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CreateCategoryDto>({
    mutationFn: categoryApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, { id: string; data: UpdateCategoryDto }>({
    mutationFn: ({ id, data }) => categoryApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: categoryApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};
