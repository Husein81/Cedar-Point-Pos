import { AdjustmentType } from '@repo/types';

export type CreateStockAdjustmentDto = {
  branchId: string;
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
};

export class StockAdjustmentHistoryQueryDto {
  page?: number;
  limit?: number;
  branchId?: string;
  productId?: string;
  type?: AdjustmentType;
  startDate?: string;
  endDate?: string;
}
