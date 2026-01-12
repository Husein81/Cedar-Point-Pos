import { OrderType } from '@repo/types';
import { z } from 'zod';

export const createOrderItemDto = z.object({
  productId: z.string(),
  quantity: z.number(),
  notes: z.string().optional(),
  modifiers: z.array(z.string()).optional(), // Array of modifier IDs
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
  discount: z.number().min(0).optional(), // Discount amount (must be >= 0)
  shippingFee: z.number().min(0).optional(), // Shipping fee (must be >= 0)
});
export type CreateOrderDto = z.infer<typeof createOrderDto>;
