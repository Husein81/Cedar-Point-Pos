import { UseMutationResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryWithSubcategories,
} from "@/dto/category.dto";
import type { QueryParams } from "@repo/types";
import { categoryApi } from "@/apis/categoryApi";
import { Category } from "@repo/types";
import { UseQueryResult } from "@tanstack/react-query";

const CATEGORY_QUERY_KEY = ["categories"];

export const useCategories = (params?: QueryParams):UseQueryResult<CategoryWithSubcategories[], Error>   => {
  return useQuery({
    queryKey: [...CATEGORY_QUERY_KEY, params],
    queryFn: () => categoryApi.getCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategory = (id: string): UseQueryResult<CategoryWithSubcategories, Error>   => {
  return useQuery({
    queryKey: [...CATEGORY_QUERY_KEY, id],
    queryFn: () => categoryApi.getCategory(id),
    enabled: !!id,
  });
};

export const useCreateCategory = (): UseMutationResult<Category, Error,CreateCategoryDto > => {
  const queryClient = useQueryClient();

  return useMutation({
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
