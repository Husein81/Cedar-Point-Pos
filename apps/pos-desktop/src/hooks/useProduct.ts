import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../apis/productsApi";
import type { Product, QueryParams } from "@repo/types";
import {
  BulkImportResult,
  BulkProductRow,
  CreateProductDto,
  ProductWithRelations,
  UpdateProductDto,
} from "@/dto/products.dto";
import { useBranchStore } from "@/store/branchStore";
import { toast } from "@repo/ui";

const PRODUCT_QUERY_KEY = ["products"];

export const useProducts = () => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, branchId],
    queryFn: () => productsApi.getProducts(branchId || undefined),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days — kept for offline use
    networkMode: "offlineFirst",
    enabled: !!branchId,
  });
};

export const useProductsPaginated = (params?: QueryParams) => {
  const { branchId } = useBranchStore();

  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, "paginated", params, branchId],
    queryFn: () =>
      productsApi.getProductsPaginated(params, branchId || undefined),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 7 * 24 * 60 * 60 * 1000,
    networkMode: "offlineFirst",
    enabled: !!branchId,
  });
};

export const useProduct = (id: string) => {
  return useQuery<ProductWithRelations>({
    queryKey: [...PRODUCT_QUERY_KEY, id],
    queryFn: () => productsApi.getProduct(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, CreateProductDto>({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, { id: string; data: UpdateProductDto }>({
    mutationFn: ({ id, data }) => productsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
    },
  });
};

export const useBulkCreateProducts = () => {
  const queryClient = useQueryClient();
  const { branchId } = useBranchStore();

  return useMutation<BulkImportResult, Error, BulkProductRow[]>({
    mutationFn: (rows) =>
      productsApi.bulkCreateProducts(rows, branchId || undefined),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["adjustmentHistory"] });
      const { createdCount, skippedCount, errorCount } = result;
      if (createdCount > 0) {
        toast.success(
          `Imported ${createdCount} product${createdCount === 1 ? "" : "s"}`,
        );
      }
      if (skippedCount > 0 || errorCount > 0) {
        toast.warning(
          `${skippedCount} skipped, ${errorCount} failed — see details`,
        );
      }
    },
    onError: (error) => {
      toast.error(error.message || "Bulk import failed");
    },
  });
};
