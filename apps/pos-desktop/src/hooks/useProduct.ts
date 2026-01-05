import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../apis/productsApi";
import type { Product, QueryParams } from "@repo/types";
import {
  CreateProductDto,
  ProductWithRelations,
  UpdateProductDto,
} from "@/dto/products.dto";

const PRODUCT_QUERY_KEY = ["products"];

export const useProducts = (params?: QueryParams) => {
  return useQuery({
    queryKey: [...PRODUCT_QUERY_KEY, params],
    queryFn: () => productsApi.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
