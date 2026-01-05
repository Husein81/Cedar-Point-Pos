import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subcategoryApi,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
} from "../apis/subcategoryApi";
import type { Subcategory } from "@repo/types";

const CATEGORY_QUERY_KEY = ["categories"];

export const useCreateSubcategory = (categoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation<Subcategory, Error, CreateSubcategoryDto>({
    mutationFn: (data) => subcategoryApi.createSubcategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CATEGORY_QUERY_KEY, categoryId],
      });
    },
  });
};

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Subcategory,
    Error,
    { id: string; data: UpdateSubcategoryDto }
  >({
    mutationFn: ({ id, data }) => subcategoryApi.updateSubcategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};

export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: subcategoryApi.deleteSubcategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
  });
};
