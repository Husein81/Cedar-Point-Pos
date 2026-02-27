import { z } from 'zod';
import { PurchaseOrderItemInputSchema } from './purchase-order-item.dto.js';

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  items: z
    .array(PurchaseOrderItemInputSchema)
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
  orderNumber: z.string().optional(),
});
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
