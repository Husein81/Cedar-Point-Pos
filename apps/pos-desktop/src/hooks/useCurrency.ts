import { currencyApi } from "@/apis/currencyApi";
import {
  CreateTenantCurrencyDto,
  UpdateTenantCurrencyDto,
} from "@/dto/currency.dto";
import type {
  Currency,
  PaginationResponse,
  QueryParams,
  TenantCurrenciesResponse,
  TenantCurrency,
} from "@repo/types";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const CURRENCY_QUERY_KEY = ["currencies"];
const TENANT_CURRENCY_QUERY_KEY = ["tenant-currencies"];
const ACTIVE_CURRENCIES_QUERY_KEY = ["active-currencies"];

// ==========================================
// TENANT CURRENCY HOOKS
// ==========================================

/**
 * Get all currencies configured for the current tenant
 * Includes base currency information
 */
export const useTenantCurrencies = () => {
  return useQuery<TenantCurrenciesResponse>({
    queryKey: TENANT_CURRENCY_QUERY_KEY,
    queryFn: () => currencyApi.getTenantCurrencies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get paginated currencies for the current tenant
 */
export const useTenantCurrenciesPaginated = (params?: QueryParams) => {
  return useQuery<PaginationResponse<TenantCurrency>>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, "paginated", params],
    queryFn: () => currencyApi.getTenantCurrenciesPaginated(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get only active currencies (for POS dropdown)
 */
export const useActiveTenantCurrencies = () => {
  return useQuery<TenantCurrency[]>({
    queryKey: ACTIVE_CURRENCIES_QUERY_KEY,
    queryFn: () => currencyApi.getActiveTenantCurrencies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a specific tenant currency by ID
 */
export const useTenantCurrency = (id: string) => {
  return useQuery<TenantCurrency>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, id],
    queryFn: () => currencyApi.getTenantCurrency(id),
    enabled: !!id,
  });
};

/**
 * Get a tenant currency by code
 */
export const useTenantCurrencyByCode = (
  code: string,
): UseQueryResult<TenantCurrency> => {
  return useQuery<TenantCurrency>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, "code", code],
    queryFn: () => currencyApi.getTenantCurrencyByCode(code),
    enabled: !!code,
  });
};

/**
 * Create a new tenant currency
 */
export const useCreateTenantCurrency = (): UseMutationResult<
  TenantCurrency,
  any,
  CreateTenantCurrencyDto
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currencyApi.createTenantCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ACTIVE_CURRENCIES_QUERY_KEY,
      });
    },
  });
};

/**
 * Update a tenant currency (exchange rate, active status)
 */
export const useUpdateTenantCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TenantCurrency,
    Error,
    { id: string; data: UpdateTenantCurrencyDto }
  >({
    mutationFn: ({ id, data }) => currencyApi.updateTenantCurrency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_CURRENCIES_QUERY_KEY });
    },
  });
};

/**
 * Delete a tenant currency
 */
export const useDeleteTenantCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: currencyApi.deleteTenantCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_CURRENCIES_QUERY_KEY });
    },
  });
};

/**
 * Set the base currency for the tenant
 */
export const useSetBaseCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<{ id: string; baseCurrencyCode: string }, Error, string>({
    mutationFn: currencyApi.setBaseCurrency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_CURRENCIES_QUERY_KEY });
    },
  });
};

// ==========================================
// GLOBAL CURRENCY REFERENCE HOOKS
// ==========================================

/**
 * Get all available currencies from the global reference table
 */
export const useAllCurrencies = () => {
  return useQuery<Currency[]>({
    queryKey: [...CURRENCY_QUERY_KEY, "all"],
    queryFn: () => currencyApi.getAllCurrencies(),
    staleTime: 30 * 60 * 1000, // 30 minutes (reference data rarely changes)
  });
};

/**
 * Get a specific currency from the reference table
 */
export const useCurrency = (code: string) => {
  return useQuery<Currency>({
    queryKey: [...CURRENCY_QUERY_KEY, code],
    queryFn: () => currencyApi.getCurrency(code),
    enabled: !!code,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
