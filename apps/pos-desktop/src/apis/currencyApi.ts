import {
  CreateTenantCurrencyDto,
  SetBaseCurrencyResponse,
  UpdateTenantCurrencyDto,
} from "@/dto/currency.dto";
import type {
  Currency,
  PaginationResponse,
  QueryParams,
  TenantCurrenciesResponse,
  TenantCurrency,
} from "@repo/types";
import { api } from "../lib/api";

// ==========================================
// Currency API
// ==========================================
export const currencyApi = {
  getTenantCurrencies: async (): Promise<TenantCurrenciesResponse> => {
    const response = await api.get<TenantCurrenciesResponse>("/currencies");
    return response.data;
  },

  /**
   * Get paginated currencies for the current tenant
   */
  getTenantCurrenciesPaginated: async (
    params?: QueryParams,
  ): Promise<PaginationResponse<TenantCurrency>> => {
    const response = await api.get<PaginationResponse<TenantCurrency>>(
      "/currencies/paginated",
      { params },
    );
    return response.data;
  },

  /**
   * Get only active currencies (for POS dropdown)
   */
  getActiveTenantCurrencies: async (): Promise<TenantCurrency[]> => {
    const response = await api.get<TenantCurrency[]>("/currencies/active");
    return response.data;
  },

  /**
   * Get a specific tenant currency configuration by ID
   */
  getTenantCurrency: async (id: string): Promise<TenantCurrency> => {
    const response = await api.get<TenantCurrency>(`/currencies/${id}`);
    return response.data;
  },

  /**
   * Get a tenant currency by its code
   */
  getTenantCurrencyByCode: async (code: string): Promise<TenantCurrency> => {
    const response = await api.get<TenantCurrency>(`/currencies/code/${code}`);
    return response.data;
  },

  /**
   * Add a new currency to the tenant's configuration
   */
  createTenantCurrency: async (
    data: CreateTenantCurrencyDto,
  ): Promise<TenantCurrency> => {
    const response = await api.post<TenantCurrency>("/currencies", data);
    return response.data;
  },

  /**
   * Update a tenant currency (exchange rate, active status)
   * Changes only affect future orders, never retroactive
   */
  updateTenantCurrency: async (
    id: string,
    data: UpdateTenantCurrencyDto,
  ): Promise<TenantCurrency> => {
    const response = await api.put<TenantCurrency>(`/currencies/${id}`, data);
    return response.data;
  },

  /**
   * Delete a tenant currency configuration
   * Cannot delete if used in payments - use deactivation instead
   */
  deleteTenantCurrency: async (id: string): Promise<void> => {
    await api.delete(`/currencies/${id}`);
  },

  /**
   * Set the base currency for the tenant
   * This is a significant operation affecting reporting
   */
  setBaseCurrency: async (
    currencyCode: string,
  ): Promise<SetBaseCurrencyResponse> => {
    const response = await api.put<SetBaseCurrencyResponse>(
      `/currencies/base/${currencyCode}`,
    );
    return response.data;
  },

  // ==========================================
  // GLOBAL CURRENCY REFERENCE ENDPOINTS
  // ==========================================

  /**
   * Get all available currencies from the global reference table
   */
  getAllCurrencies: async (): Promise<Currency[]> => {
    const response = await api.get<Currency[]>("/currencies/reference/all");
    return response.data;
  },

  /**
   * Get a specific currency from the reference table
   */
  getCurrency: async (code: string): Promise<Currency> => {
    const response = await api.get<Currency>(`/currencies/reference/${code}`);
    return response.data;
  },
};
