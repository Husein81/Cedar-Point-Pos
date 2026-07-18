import type {
  CreateCustomerDto,
  CustomerDetails,
  CustomerFullDetails,
  CustomerOrder,
  CustomerSummary,
} from "@/dto/customer.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";
import { api } from "../lib/api";

export const customerApi = {
  /**
   * Search customers by name or phone (Legacy / Simple list)
   */
  searchCustomers: async (
    query: string,
    limit: number = 10,
  ): Promise<CustomerSummary[]> => {
    const response = await api.get("/customers/search", {
      params: { query, limit },
    });
    return response.data;
  },

  /**
   * Get customers with pagination, sorting and filtering
   */
  getCustomersPaginated: async (
    params?: QueryParams,
  ): Promise<PaginationResponse<CustomerDetails>> => {
    const response = await api.get("/customers/paginated", {
      params,
    });
    return response.data;
  },

  /**
   * Get customer full details by ID (with stats)
   */
  getCustomer: async (id: string): Promise<CustomerFullDetails> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Get customer orders with pagination
   */
  getCustomerOrders: async (
    id: string,
    params?: QueryParams,
  ): Promise<PaginationResponse<CustomerOrder>> => {
    const response = await api.get(`/customers/${id}/orders`, {
      params,
    });
    return response.data;
  },

  /**
   * Create a new customer
   */
  createCustomer: async (data: CreateCustomerDto): Promise<CustomerSummary> => {
    const response = await api.post("/customers", data);
    return response.data;
  },

  /**
   * Update an existing customer
   */
  updateCustomer: async (
    id: string,
    data: Partial<CreateCustomerDto>,
  ): Promise<CustomerDetails> => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};
