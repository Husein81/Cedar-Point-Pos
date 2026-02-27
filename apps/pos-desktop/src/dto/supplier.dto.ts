import { PurchaseOrderItemType } from "@repo/types";
import { z } from "zod";

const SupplierSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  companyName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});
export type SupplierSummary = z.infer<typeof SupplierSummarySchema>;

const SupplierDetailsSchema = SupplierSummarySchema.extend({
  address: z.string().nullable(),
  category: z.string().nullable(),
  currentBalance: z.number(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    purchaseOrders: z.number(),
  }),
});
export type SupplierDetails = z.infer<typeof SupplierDetailsSchema>;

const SupplierFullDetailsSchema = SupplierDetailsSchema.omit({
  _count: true,
}).extend({
  totalOrders: z.number(),
  totalPurchaseAmount: z.number(),
  averagePurchaseValue: z.number(),
  lastPurchaseDate: z.string().nullable(),
  lastPurchaseAmount: z.number().nullable(),
});
export type SupplierFullDetails = z.infer<typeof SupplierFullDetailsSchema>;

const SupplierPurchaseOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  notes: z.string().nullable(),
  orderedAt: z.string(),
  receivedAt: z.string().nullable(),
  branch: z.object({
    id: z.string(),
    name: z.string(),
  }),
  items: z.array(
    z.object({
      id: z.string(),
      itemType: z.enum(PurchaseOrderItemType),
      productId: z.string().nullable(),
      itemName: z.string(),
      quantity: z.string(),
      unitCost: z.string(),
      totalCost: z.string(),
      notes: z.string().nullable().optional(),
      product: z.object({
        id: z.string(),
        name: z.string(),
        sku: z.string().nullable(),
        barcode: z.string().nullable(),
      }).nullable().optional(),
    })
  ),
});
export type SupplierPurchaseOrder = z.infer<
  typeof SupplierPurchaseOrderSchema
>;

export const CreateSupplierSchema = z.object({
  name: z.string(),
  companyName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type CreateSupplierDto = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial().extend({
  currentBalance: z.number().optional(),
});
export type UpdateSupplierDto = z.infer<typeof UpdateSupplierSchema>;
