import { z } from "zod";
import { BranchSummarySchema, ProductSummarySchema } from "./common.dto";

export const PurchaseOrderItemFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  notes: z.string().optional(),
});
export type PurchaseOrderItemForm = z.infer<typeof PurchaseOrderItemFormSchema>;

export const CreatePurchaseOrderFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().min(1, "Branch is required"),
  orderNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(PurchaseOrderItemFormSchema)
    .min(1, "At least one item is required"),
});
export type CreatePurchaseOrderFormDto = z.infer<
  typeof CreatePurchaseOrderFormSchema
>;

const PurchaseOrderItemResponseSchema = z.object({
  id: z.string(),
  purchaseOrderId: z.string(),
  productId: z.string(),
  quantity: z.string(),
  unitCost: z.string(),
  totalCost: z.string(),
  notes: z.string().nullable(),
  product: ProductSummarySchema,
});
export type PurchaseOrderItemResponse = z.infer<
  typeof PurchaseOrderItemResponseSchema
>;

export const PurchaseOrderDetailsSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  orderedAt: z.string(),
  receivedAt: z.string().nullable(),
  supplier: z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  branch: BranchSummarySchema,
  items: z.array(PurchaseOrderItemResponseSchema),
});
export type PurchaseOrderDetails = z.infer<typeof PurchaseOrderDetailsSchema>;

export const PurchaseOrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  orderedAt: z.string(),
  receivedAt: z.string().nullable(),
  supplier: z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string().nullable(),
  }),
  branch: BranchSummarySchema,
  _count: z.object({
    items: z.number(),
  }),
});
export type PurchaseOrderSummary = z.infer<typeof PurchaseOrderSummarySchema>;
