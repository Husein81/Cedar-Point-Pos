import { InventoryChangeType } from '@repo/types';

/**
 * Internal type contracts for the inventory service layer.
 *
 * These shapes are constructed in-code and used purely as TypeScript types —
 * none are validated against an incoming request body, so they are plain types
 * rather than class-validator DTOs.
 */

export interface InventoryQuery {
  branchId?: string;
  productId?: string;
  userId?: string;
  changeType?: InventoryChangeType;
  page?: string;
  limit?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateInventoryHistoryDto {
  tenantId?: string;
  branchId?: string;
  productId?: string;
  userId?: string;
  changeType?: InventoryChangeType;
  beforeStock?: number;
  afterStock?: number;
  adjustment?: number;
  beforeMinStock?: number;
  afterMinStock?: number;
  reason?: string;
  createdAt?: Date;
}

export type ReferenceType =
  | 'ORDER'
  | 'REFUND'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'PURCHASE_ORDER';

export interface InventoryTransactionInput {
  tenantId: string;
  branchId: string;
  productId: string;
  userId: string;
  changeType: InventoryChangeType;
  quantity: number;
  reason?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
  allowNegativeStock?: boolean;
  minStock?: number;
  afterMinStock?: number;
}

export interface TransactionResult {
  inventoryId: string;
  beforeStock: number;
  afterStock: number;
  afterMinStock?: number;
  adjustment: number;
  historyId: string;
}
