import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  currencyApi,
  CreateCurrencyPayload,
  UpdateCurrencyPayload,
} from "../apis/currencyApi";
import type { Currency } from "@repo/types";

const CURRENCY_QUERY_KEY = ["currencies"];

/**
 * Get all currencies from the global reference table
 */
export const useCurrencies = () => {
  return useQuery<Currency[]>({
    queryKey: CURRENCY_QUERY_KEY,
    queryFn: () => currencyApi.getAll(),
    staleTime: 30 * 60 * 1000, // 30 minutes (reference data rarely changes)
  });
};

/**
 * Get a single currency by code
 */
export const useCurrency = (code: string) => {
  return useQuery<Currency>({
    queryKey: [...CURRENCY_QUERY_KEY, code],
    queryFn: () => currencyApi.getByCode(code),
    enabled: !!code,
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * Create a new currency
 */
export const useCreateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<Currency, Error, CreateCurrencyPayload>({
    mutationFn: currencyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCY_QUERY_KEY });
    },
  });
};

/**
 * Update a currency
 */
export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Currency,
    Error,
    { code: string; data: UpdateCurrencyPayload }
  >({
    mutationFn: ({ code, data }) => currencyApi.update(code, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CURRENCY_QUERY_KEY });
    },
  });
};
