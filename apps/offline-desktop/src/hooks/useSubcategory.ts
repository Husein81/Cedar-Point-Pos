import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { SubcategoryInput } from "@/shared/schemas";

// Subcategories aren't cached separately — they ride along nested inside
// Category (categories:list), so every mutation just invalidates that key.
const CATEGORY_QUERY_KEY = ["categories"];

export const useCreateSubcategory = (categoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubcategoryInput) =>
      invoke("subcategories:create", { categoryId, data: input }),
    onSuccess: (data) => {
      toast.success(`Subcategory "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create subcategory"));
    },
  });
};

export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubcategoryInput }) =>
      invoke("subcategories:update", { id, data }),
    onSuccess: () => {
      toast.success("Subcategory updated");
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update subcategory"));
    },
  });
};

export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("subcategories:delete", { id }),
    onSuccess: () => {
      toast.success("Subcategory deleted");
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete subcategory"));
    },
  });
};
