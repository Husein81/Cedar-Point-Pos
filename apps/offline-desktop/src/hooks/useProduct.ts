import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type { ListProductsInput, ProductInput } from "@/shared/schemas";

const PRODUCT_QUERY_KEY = ["products"];
const STOCK_QUERY_KEY = ["stock"];

export const useProducts = (params: ListProductsInput) =>
  useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, params],
    queryFn: () => invoke("products:list", params),
    placeholderData: (previous) => previous,
  });

export const useProduct = (id: string) =>
  useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, id],
    queryFn: () => invoke("products:get", { id }),
    enabled: !!id,
  });

export const useProductByBarcode = () =>
  useMutation({
    mutationFn: (barcode: string) => invoke("products:getByBarcode", { barcode }),
  });

export const useLowStockProducts = () =>
  useQuery({
    queryKey: [...STOCK_QUERY_KEY, "low"],
    queryFn: () => invoke("stock:lowStock", undefined),
  });

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProductInput) => invoke("products:create", input),
    onSuccess: (data) => {
      toast.success(`Product "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to create product"));
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductInput }) =>
      invoke("products:update", { id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update product"));
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke("products:delete", { id }),
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to delete product"));
    },
  });
};
