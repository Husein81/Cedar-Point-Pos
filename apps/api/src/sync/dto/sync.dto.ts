import {
  CustomerSchema,
  InventoryHistorySchema,
  OrderSchema,
  PaymentSchema,
  ShiftSchema,
} from '@repo/types';
import z from 'zod';

export const SyncResponseSchema = z.object({
  success: z.boolean(),
  synced: z.object({
    orders: z.array(z.string()).optional(),
    payments: z.array(z.string()).optional(),
    inventoryHistory: z.array(z.string()).optional(),
    shifts: z.array(z.string()).optional(),
    customers: z.array(z.string()).optional(),
  }),
  conflicts: z.object({
    orders: z.array(z.string()).optional(),
    payments: z.array(z.string()).optional(),
    inventoryHistory: z.array(z.string()).optional(),
    shifts: z.array(z.string()).optional(),
    customers: z.array(z.string()).optional(),
  }),
  errors: z
    .array(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        error: z.string(),
      }),
    )
    .optional(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const SyncBatchSchema = z.object({
  orders: z.array(OrderSchema).optional(),
  payments: z.array(PaymentSchema).optional(),
  inventoryHistory: z.array(InventoryHistorySchema).optional(),
  shifts: z.array(ShiftSchema).optional(),
  customers: z.array(CustomerSchema).optional(),
});
export type SyncBatch = z.infer<typeof SyncBatchSchema>;
