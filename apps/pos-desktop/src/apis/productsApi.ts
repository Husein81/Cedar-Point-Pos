import {
  CreateProductDto,
  ProductWithRelations,
  UpdateProductDto,
} from "@/dto/products.dto";
import type { PaginationResponse, Product, QueryParams } from "@repo/types";
import { api } from "./api";

export const productsApi = {
  getProducts: async (branchId?: string): Promise<Product[]> => {
    const response = await api.get("/products", {
      params: { branchId },
    });
    return response.data;
  },
  getProductsPaginated: async (
    params?: QueryParams,
    branchId?: string
  ): Promise<PaginationResponse<Product>> => {
    const response = await api.get("/products/paginated", {
      params: {
        ...params,
        branchId,
      },
    });
    return response.data;
  },
  getProduct: async (id: string): Promise<ProductWithRelations> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (data: CreateProductDto): Promise<Product> => {
    const response = await api.post<Product>("/products", data);
    return response.data;
  },

  updateProduct: async (
    id: string,
    data: UpdateProductDto
  ): Promise<Product> => {
    const response = await api.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
