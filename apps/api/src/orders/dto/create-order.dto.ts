import { OrderType } from '@repo/db';
import z from 'zod';

export const createOrderItemDto = z.object({
  productId: z.string(),
  quantity: z.number(),
  notes: z.string().optional(),
});
export type CreateOrderItemDto = z.infer<typeof createOrderItemDto>;

export const createOrderDto = z.object({
  branchId: z.string(),
  type: z.enum(OrderType),
  tableId: z.string().optional(),
  deviceId: z.string().optional(),
  shiftId: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(createOrderItemDto).optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderDto>;
