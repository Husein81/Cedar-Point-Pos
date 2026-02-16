import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loyaltyApi } from "@/apis/loyaltyApi";
import type {
  LoyaltyProgram,
  UpdateLoyaltyProgramDto,
  LoyaltyAccount,
  LoyaltyTransactionQueryParams,
  LoyaltyTransactionListResponse,
  ManualAdjustmentDto,
  LoyaltyTransaction,
} from "@/dto/loyalty.dto";

// ============================================================
// Query Keys
// ============================================================

const LOYALTY_QUERY_KEY = ["loyalty"];

export const loyaltyKeys = {
  all: LOYALTY_QUERY_KEY,
  program: () => [...LOYALTY_QUERY_KEY, "program"] as const,
  account: (customerId: string) =>
    [...LOYALTY_QUERY_KEY, "account", customerId] as const,
  transactions: (customerId: string, params?: LoyaltyTransactionQueryParams) =>
    [...LOYALTY_QUERY_KEY, "transactions", customerId, params] as const,
};

// ============================================================
// Program Hooks
// ============================================================

/**
 * Fetch the loyalty program config for the current tenant
 */
export const useLoyaltyProgram = () => {
  return useQuery<LoyaltyProgram>({
    queryKey: loyaltyKeys.program(),
    queryFn: loyaltyApi.getProgram,
    staleTime: 5 * 60 * 1000, // 5 minutes — config rarely changes
  });
};

/**
 * Update the loyalty program config
 */
export const useUpdateLoyaltyProgram = () => {
  const queryClient = useQueryClient();

  return useMutation<LoyaltyProgram, Error, UpdateLoyaltyProgramDto>({
    mutationFn: loyaltyApi.updateProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
    },
  });
};

// ============================================================
// Account Hooks
// ============================================================

/**
 * Fetch loyalty account for a customer
 */
export const useCustomerLoyaltyAccount = (customerId: string | null) => {
  return useQuery<LoyaltyAccount>({
    queryKey: loyaltyKeys.account(customerId!),
    queryFn: () => loyaltyApi.getCustomerAccount(customerId!),
    enabled: !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
};

// ============================================================
// Transaction Hooks
// ============================================================

/**
 * Fetch paginated loyalty transactions for a customer
 */
export const useCustomerLoyaltyTransactions = (
  customerId: string | null,
  params?: LoyaltyTransactionQueryParams,
) => {
  return useQuery<LoyaltyTransactionListResponse>({
    queryKey: loyaltyKeys.transactions(customerId!, params),
    queryFn: () => loyaltyApi.getCustomerTransactions(customerId!, params),
    enabled: !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
};

// ============================================================
// Manual Adjustment Hook
// ============================================================

/**
 * Create a manual loyalty point adjustment.
 * Invalidates both customer and loyalty queries after success.
 */
export const useManualLoyaltyAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    LoyaltyTransaction,
    Error,
    { customerId: string; data: ManualAdjustmentDto }
  >({
    mutationFn: ({ customerId, data }) =>
      loyaltyApi.createManualAdjustment(customerId, data),
    onSuccess: (_result, variables) => {
      // Invalidate loyalty account + transactions for the customer
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.account(variables.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: [...LOYALTY_QUERY_KEY, "transactions", variables.customerId],
      });
      // Invalidate customer details (they now include loyalty summary)
      queryClient.invalidateQueries({
        queryKey: ["customers", variables.customerId],
      });
      // Invalidate loyalty reports
      queryClient.invalidateQueries({
        queryKey: ["reports", "loyalty"],
      });
    },
  });
};
