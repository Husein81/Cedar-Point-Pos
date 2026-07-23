import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { CategoryInput } from "@/shared/schemas";

const CATEGORY_QUERY_KEY = ["categories"];

export const useCategories = () =>
  useQuery({
    queryKey: CATEGORY_QUERY_KEY,
    queryFn: () => invoke("categories:list", undefined),
    staleTime: 10 * 60 * 1000,
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CategoryInput) => invoke("categories:create", input),
    onSuccess: (data) => {
      toast.success(`Category "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create category"));
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryInput }) =>
      invoke("categories:update", { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update category"));
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("categories:delete", { id }),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete category"));
    },
  });
};
