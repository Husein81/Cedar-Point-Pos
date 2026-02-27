import { z } from 'zod';

const PurchaseOrderBaseItemInputSchema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  notes: z.string().optional(),
});

const ProductPurchaseOrderItemInputSchema =
  PurchaseOrderBaseItemInputSchema.extend({
    itemType: z.literal('PRODUCT'),
    productId: z.string().min(1, 'Product ID is required'),
    itemName: z.string().trim().min(1).optional(),
  });

const CustomPurchaseOrderItemInputSchema =
  PurchaseOrderBaseItemInputSchema.extend({
    itemType: z.literal('CUSTOM'),
    itemName: z.string().trim().min(1, 'Item name is required'),
  });

export const PurchaseOrderItemInputSchema = z.discriminatedUnion('itemType', [
  ProductPurchaseOrderItemInputSchema,
  CustomPurchaseOrderItemInputSchema,
]);
export type PurchaseOrderItemInputDto = z.infer<
  typeof PurchaseOrderItemInputSchema
>;

export const AddPurchaseOrderItemSchema = PurchaseOrderItemInputSchema;
export type AddPurchaseOrderItemDto = z.infer<
  typeof AddPurchaseOrderItemSchema
>;

const PurchaseOrderBaseItemUpdateSchema = z.object({
  quantity: z.number().positive('Quantity must be positive').optional(),
  unitCost: z.number().min(0, 'Unit cost cannot be negative').optional(),
  notes: z.string().optional(),
});

const ProductPurchaseOrderItemUpdateSchema =
  PurchaseOrderBaseItemUpdateSchema.extend({
    itemType: z.literal('PRODUCT'),
    productId: z.string().min(1, 'Product ID is required').optional(),
    itemName: z.string().trim().min(1).optional(),
  });

const CustomPurchaseOrderItemUpdateSchema =
  PurchaseOrderBaseItemUpdateSchema.extend({
    itemType: z.literal('CUSTOM'),
    itemName: z.string().trim().min(1).optional(),
  });

export const UpdatePurchaseOrderItemSchema = z
  .discriminatedUnion('itemType', [
    ProductPurchaseOrderItemUpdateSchema,
    CustomPurchaseOrderItemUpdateSchema,
  ])
  .superRefine((value, ctx) => {
    const hasAnyUpdateField =
      value.quantity !== undefined ||
      value.unitCost !== undefined ||
      value.notes !== undefined ||
      value.itemName !== undefined ||
      (value.itemType === 'PRODUCT' && value.productId !== undefined);

    if (!hasAnyUpdateField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided to update an item',
      });
    }
  });

export type UpdatePurchaseOrderItemDto = z.infer<
  typeof UpdatePurchaseOrderItemSchema
>;
