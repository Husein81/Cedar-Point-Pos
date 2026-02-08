import { z } from 'zod';

export const PurchaseOrderItemDto = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  notes: z.string().optional(),
});
export type PurchaseOrderItemDto = z.infer<typeof PurchaseOrderItemDto>;

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  branchId: z.string().min(1, 'Branch ID is required'),
  items: z.array(PurchaseOrderItemDto).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  orderNumber: z.string().optional(),
});
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;
