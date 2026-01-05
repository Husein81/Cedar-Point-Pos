import type { PaginationResponse, Product, QueryParams } from "@repo/types";
import { api } from "./api";
import {
  CreateProductDto,
  ProductWithRelations,
  UpdateProductDto,
} from "@/dto/products.dto";

export const productsApi = {
  getProducts: async (
    params?: QueryParams
  ): Promise<PaginationResponse<Product>> => {
    const response = await api.get("/products/paginated", {
      params,
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
