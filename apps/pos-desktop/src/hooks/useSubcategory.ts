import { CreateSubcategoryDto, UpdateSubcategoryDto } from "@/dto/category.dto";
import type { Subcategory } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { subcategoryApi } from "../apis/subcategoryApi";
import { extractErrorMessage } from "@/utils/error";

const CATEGORY_QUERY_KEY = ["categories"];

export const useCreateSubcategory = (categoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation<Subcategory, Error, CreateSubcategoryDto>({
    mutationFn: (data) => subcategoryApi.createSubcategory(categoryId, data),
    onSuccess: (data) => {
      toast.success(`Subcategory "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CATEGORY_QUERY_KEY, categoryId],
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create subcategory"));
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
