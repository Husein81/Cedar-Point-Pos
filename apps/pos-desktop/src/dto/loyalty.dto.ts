import type {
  LoyaltyEnrollmentMode,
  LoyaltyTransactionType,
  LoyaltyDirection,
  PaginationResponse,
} from "@repo/types";

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

export interface LoyaltyTransactionQueryParams {
  page?: number;
  limit?: number;
  type?: LoyaltyTransactionType;
  from?: string;
  to?: string;
}

export type LoyaltyTransactionListResponse =
  PaginationResponse<LoyaltyTransaction>;

export interface ManualAdjustmentDto {
  points: number;
  reason: string;
}
