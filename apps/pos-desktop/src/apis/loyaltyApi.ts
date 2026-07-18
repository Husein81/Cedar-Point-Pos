import { api } from "../lib/api";
import type {
  LoyaltyProgram,
  UpdateLoyaltyProgramDto,
  LoyaltyAccount,
  LoyaltyTransactionQueryParams,
  LoyaltyTransactionListResponse,
  ManualAdjustmentDto,
  LoyaltyTransaction,
} from "@/dto/loyalty.dto";

const basePath = "/loyalty";

export const loyaltyApi = {
  /**
   * Get loyalty program config for current tenant
   * GET /loyalty/program
   */
  getProgram: async (): Promise<LoyaltyProgram> => {
    const response = await api.get<LoyaltyProgram>(`${basePath}/program`);
    return response.data;
  },

  /**
   * Update loyalty program config
   * PUT /loyalty/program
   */
  updateProgram: async (
    data: UpdateLoyaltyProgramDto,
  ): Promise<LoyaltyProgram> => {
    const response = await api.put<LoyaltyProgram>(`${basePath}/program`, data);
    return response.data;
  },

  /**
   * Get loyalty account for a customer
   * GET /loyalty/customers/:customerId/account
   */
  getCustomerAccount: async (customerId: string): Promise<LoyaltyAccount> => {
    const response = await api.get<LoyaltyAccount>(
      `${basePath}/customers/${customerId}/account`,
    );
    return response.data;
  },

  /**
   * List loyalty transactions for a customer (paginated)
   * GET /loyalty/customers/:customerId/transactions
   */
  getCustomerTransactions: async (
    customerId: string,
    params?: LoyaltyTransactionQueryParams,
  ): Promise<LoyaltyTransactionListResponse> => {
    const response = await api.get<LoyaltyTransactionListResponse>(
      `${basePath}/customers/${customerId}/transactions`,
      { params },
    );
    return response.data;
  },

  /**
   * Create a manual loyalty point adjustment
   * POST /loyalty/customers/:customerId/adjustments
   */
  createManualAdjustment: async (
    customerId: string,
    data: ManualAdjustmentDto,
  ): Promise<LoyaltyTransaction> => {
    const response = await api.post<LoyaltyTransaction>(
      `${basePath}/customers/${customerId}/adjustments`,
      data,
    );
    return response.data;
  },
};
