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
import { toast } from "@repo/ui";
import { extractErrorMessage } from "@/utils/error";

const CURRENCY_QUERY_KEY = ["currencies"];
const TENANT_CURRENCY_QUERY_KEY = ["tenant-currencies"];
const ACTIVE_CURRENCIES_QUERY_KEY = ["active-currencies"];

export const useTenantCurrencies = () => {
  return useQuery<TenantCurrenciesResponse>({
    queryKey: TENANT_CURRENCY_QUERY_KEY,
    queryFn: () => currencyApi.getTenantCurrencies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * The tenant's base currency (code + symbol) and a money formatter that uses
 * it. Amounts are stored in the base currency, so all price displays should go
 * through this instead of a hard-coded "$". Symbol is suffixed (e.g. "50,000
 * L.L") to match the invoice formatting convention.
 */
export const useBaseCurrency = () => {
  const { data } = useTenantCurrencies();
  const code = data?.baseCurrencyCode ?? "USD";
  const currency = data?.currencies.find(
    (c) => c.currencyCode === code,
  )?.currency;
  const symbol = currency?.symbol || code;
  // Honour the currency's own precision: LBP has 0 decimals, so "1,260,000"
  // rather than "1,260,000.00"; USD keeps its 2.
  const decimalPlaces = currency?.decimalPlaces ?? 2;

  const format = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(num)} ${symbol}`;
  };

  return { code, symbol, decimalPlaces, format };
};

export const useTenantCurrenciesPaginated = (params?: QueryParams) => {
  return useQuery<PaginationResponse<TenantCurrency>>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, "paginated", params],
    queryFn: () => currencyApi.getTenantCurrenciesPaginated(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useActiveTenantCurrencies = () => {
  return useQuery<TenantCurrency[]>({
    queryKey: ACTIVE_CURRENCIES_QUERY_KEY,
    queryFn: () => currencyApi.getActiveTenantCurrencies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTenantCurrency = (id: string) => {
  return useQuery<TenantCurrency>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, id],
    queryFn: () => currencyApi.getTenantCurrency(id),
    enabled: !!id,
  });
};

export const useTenantCurrencyByCode = (
  code: string,
): UseQueryResult<TenantCurrency> => {
  return useQuery<TenantCurrency>({
    queryKey: [...TENANT_CURRENCY_QUERY_KEY, "code", code],
    queryFn: () => currencyApi.getTenantCurrencyByCode(code),
    enabled: !!code,
  });
};

export const useCreateTenantCurrency = (): UseMutationResult<
  TenantCurrency,
  any,
  CreateTenantCurrencyDto
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: currencyApi.createTenantCurrency,
    onSuccess: (data) => {
      toast.success(`${data.currencyCode} added`);
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ACTIVE_CURRENCIES_QUERY_KEY,
      });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to add currency"));
    },
  });
};

export const useUpdateTenantCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TenantCurrency,
    Error,
    { id: string; data: UpdateTenantCurrencyDto }
  >({
    mutationFn: ({ id, data }) => currencyApi.updateTenantCurrency(id, data),
    onSuccess: () => {
      toast.success("Currency updated");
      queryClient.invalidateQueries({ queryKey: TENANT_CURRENCY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_CURRENCIES_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to update currency"));
    },
  });
};

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

export const useAllCurrencies = () => {
  return useQuery<Currency[]>({
    queryKey: [...CURRENCY_QUERY_KEY, "all"],
    queryFn: () => currencyApi.getAllCurrencies(),
    staleTime: 30 * 60 * 1000, // 30 minutes (reference data rarely changes)
  });
};

export const useCurrency = (code: string) => {
  return useQuery<Currency>({
    queryKey: [...CURRENCY_QUERY_KEY, code],
    queryFn: () => currencyApi.getCurrency(code),
    enabled: !!code,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};
