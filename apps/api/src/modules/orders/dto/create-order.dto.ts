import { OrderType, PaymentMethod } from '@repo/types';
import { z } from 'zod';

export const createOrderItemDto = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number().optional(), // Override product price
  discount: z
    .object({
      value: z.number().min(0),
      type: z.enum(['PERCENTAGE', 'FIXED']),
    })
    .optional(), // Item-level discount
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
  includeVAT: z.boolean().optional(), // Whether to include 11% VAT
});
export type CreateOrderDto = z.infer<typeof createOrderDto>;

export const PaymentDto = z.object({
  amount: z.number(),
  method: z.enum(PaymentMethod),
  currencyCode: z.string().optional(),
  exchangeRate: z.number().optional(),
});
export type PaymentDto = z.infer<typeof PaymentDto>;

export const BatchPaymentDto = z.array(PaymentDto);
export type BatchPaymentDto = z.infer<typeof BatchPaymentDto>;
