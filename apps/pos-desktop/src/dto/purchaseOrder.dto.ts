import { PurchaseOrderItemType } from "@repo/types";
import { z } from "zod";

const ProductSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
});

const SupplierSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  companyName: z.string().nullable(),
});

const BranchSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const PurchaseOrderItemSchema = z.object({
  id: z.string(),
  itemType: z.enum(PurchaseOrderItemType),
  productId: z.string().nullable(),
  itemName: z.string(),
  quantity: z.string(),
  unitCost: z.string(),
  totalCost: z.string(),
  notes: z.string().nullable().optional(),
  product: ProductSummarySchema.nullable().optional(),
});
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

const PurchaseOrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  orderedAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable(),
  supplier: SupplierSummarySchema,
  branch: BranchSummarySchema,
  _count: z.object({ items: z.number() }),
});
export type PurchaseOrderSummary = z.infer<typeof PurchaseOrderSummarySchema>;

const PurchaseOrderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.string().nullable(),
  status: z.string(),
  totalAmount: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  orderedAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable(),
  supplier: SupplierSummarySchema,
  branch: BranchSummarySchema,
  items: z.array(PurchaseOrderItemSchema),
});
export type PurchaseOrderDetail = z.infer<typeof PurchaseOrderDetailSchema>;

export const ProductPurchaseOrderItemInputSchema = z.object({
  itemType: z.literal(PurchaseOrderItemType.PRODUCT),
  productId: z.string().min(1),
  itemName: z.string().trim().min(1).optional(),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  notes: z.string().optional(),
});

export const CustomPurchaseOrderItemInputSchema = z.object({
  itemType: z.literal(PurchaseOrderItemType.CUSTOM),
  itemName: z.string().trim().min(1, "Item name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().min(0, "Unit cost cannot be negative"),
  notes: z.string().optional(),
});

export const PurchaseOrderItemInputSchema = z.discriminatedUnion("itemType", [
  ProductPurchaseOrderItemInputSchema,
  CustomPurchaseOrderItemInputSchema,
]);
export type PurchaseOrderItemInput = z.infer<typeof PurchaseOrderItemInputSchema>;

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().min(1, "Branch is required"),
  items: z
    .array(PurchaseOrderItemInputSchema)
    .min(1, "At least one item is required"),
  notes: z.string().optional(),
  orderNumber: z.string().optional(),
});
export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderSchema = z.object({
  notes: z.string().optional(),
  orderNumber: z.string().optional(),
});
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrderSchema>;

export const AddPurchaseOrderItemSchema = PurchaseOrderItemInputSchema;
export type AddPurchaseOrderItemDto = z.infer<typeof AddPurchaseOrderItemSchema>;

const BaseUpdateItemSchema = z.object({
  quantity: z.number().positive().optional(),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const ProductUpdateItemSchema = BaseUpdateItemSchema.extend({
  itemType: z.literal(PurchaseOrderItemType.PRODUCT),
  productId: z.string().min(1).optional(),
  itemName: z.string().trim().min(1).optional(),
});

const CustomUpdateItemSchema = BaseUpdateItemSchema.extend({
  itemType: z.literal(PurchaseOrderItemType.CUSTOM),
  itemName: z.string().trim().min(1).optional(),
});

export const UpdatePurchaseOrderItemSchema = z.discriminatedUnion("itemType", [
  ProductUpdateItemSchema,
  CustomUpdateItemSchema,
]);
export type UpdatePurchaseOrderItemDto = z.infer<
  typeof UpdatePurchaseOrderItemSchema
>;
