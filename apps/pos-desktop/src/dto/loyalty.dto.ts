import type {
  LoyaltyEnrollmentMode,
  LoyaltyTransactionType,
  LoyaltyDirection,
} from "@repo/types";

// ============================================================
// Program
// ============================================================

/**
 * Shape returned by GET /loyalty/program
 */
export interface LoyaltyProgram {
  id?: string;
  tenantId: string;
  isEnabled: boolean;
  enrollmentMode: LoyaltyEnrollmentMode;
  earnPointsPerCurrency: number | null;
  redeemPointsStep: number | null;
  redeemCurrencyPerStep: number | null;
  minRedeemPoints: number;
  maxRedeemPercent: number | null;
  allowNoCustomerAccrual: boolean;
  pointsExpirationDays: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload for PUT /loyalty/program
 */
export interface UpdateLoyaltyProgramDto {
  isEnabled?: boolean;
  enrollmentMode?: LoyaltyEnrollmentMode;
  earnPointsPerCurrency?: number;
  redeemPointsStep?: number;
  redeemCurrencyPerStep?: number;
  minRedeemPoints?: number;
  maxRedeemPercent?: number;
  allowNoCustomerAccrual?: boolean;
  pointsExpirationDays?: number | null;
}

// ============================================================
// Account
// ============================================================

/**
 * Shape returned by GET /loyalty/customers/:customerId/account
 */
export interface LoyaltyAccount {
  id?: string;
  tenantId: string;
  customerId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lifetimeRestored: number;
  lifetimeReversed: number;
  lifetimeAdjusted: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Transactions
// ============================================================

/**
 * Single loyalty transaction row
 */
export interface LoyaltyTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  customerId: string;
  orderId: string | null;
  refundId: string | null;
  type: LoyaltyTransactionType;
  direction: LoyaltyDirection;
  points: number;
  moneyAmount: number | null;
  balanceAfter: number;
  idempotencyKey: string;
  reason: string | null;
  metadata: unknown;
  actorUserId: string | null;
  createdAt: string;
  order?: { id: string; orderNumber: string | null } | null;
  refund?: { id: string; totalAmount: number | string } | null;
  actorUser?: { id: string; name: string; role: string } | null;
}

/**
 * Query params for GET /loyalty/customers/:customerId/transactions
 */
export interface LoyaltyTransactionQueryParams {
  page?: number;
  limit?: number;
  type?: LoyaltyTransactionType;
  from?: string;
  to?: string;
}

/**
 * Paginated response from listTransactions
 */
export interface LoyaltyTransactionListResponse {
  data: LoyaltyTransaction[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

// ============================================================
// Manual Adjustment
// ============================================================

/**
 * Payload for POST /loyalty/customers/:customerId/adjustments
 */
export interface ManualAdjustmentDto {
  points: number;
  reason: string;
}
