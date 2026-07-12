import { InventoryChangeType } from '@repo/types';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export type AdjustmentType = 'STOCK_IN' | 'STOCK_OUT' | 'SET_STOCK';

export class CreateStockAdjustmentDto {
  @IsString()
  branchId!: string;

  @IsString()
  productId!: string;

  @IsIn(['STOCK_IN', 'STOCK_OUT', 'SET_STOCK'])
  adjustmentType!: AdjustmentType;

  // Always positive, adjustmentType determines if adding or removing
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  reason!: string;

  // Optional minimum stock threshold
  @IsOptional()
  @IsNumber()
  minStock?: number;
}

/**
 * Query contract for the adjustment-history endpoint. Read from `req.query` and
 * used as a service type — not validated as a request DTO.
 */
export interface StockAdjustmentHistoryQueryDto {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  changeType?: InventoryChangeType;
  startDate?: string;
  endDate?: string;
}

export interface StockDeductionItem {
  productId: string;
  productName: string;
  quantity: number;
  orderItemId?: string;
}

export interface StockValidationResult {
  isValid: boolean;
  insufficientStock: Array<{
    productId: string;
    productName: string;
    required: number;
    available: number;
  }>;
}

// Stock warning info returned after deduction (does NOT block the order)
export interface StockWarningInfo {
  productId: string;
  productName: string;
  quantityDeducted: number;
  stockBefore: number;
  stockAfter: number;
}
