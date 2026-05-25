import { PurchaseOrderStatus } from '@repo/types';
import { z } from 'zod';

export const UpdatePurchaseOrderSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(PurchaseOrderStatus).optional(),
  orderNumber: z.string().optional(),
});
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>;
