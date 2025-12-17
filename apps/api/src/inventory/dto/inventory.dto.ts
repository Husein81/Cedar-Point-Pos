import { InventoryChangeType } from '@repo/types';
import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  userId: z.string().optional(),
  changeType: z.enum(InventoryChangeType).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const createInventoryHistorySchema = z.object({
  tenantId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  changeType: z.enum(InventoryChangeType).optional(),
  beforeStock: z.number().optional(),
  afterStock: z.number().optional(),
  adjustment: z.number().optional(),
  beforeMinStock: z.number().optional(),
  afterMinStock: z.number().optional(),
  reason: z.string().optional(),
  createdAt: z.date().default(new Date()).optional(),
});
export type CreateInventoryHistoryDto = z.infer<
  typeof createInventoryHistorySchema
>;
