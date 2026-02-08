import { z } from 'zod';

export const UpdatePurchaseOrderSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']).optional(),
  orderNumber: z.string().optional(),
});
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>;
