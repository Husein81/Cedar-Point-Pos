import z from "zod";
import id from "zod/v4/locales/id.js";

// ===========================================
//         Enums
// ===========================================
export enum BusinessType {
  RESTAURANT = "RESTAURANT",
  RETAIL = "RETAIL",
}

export enum UserRole {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER",
  KITCHEN = "KITCHEN",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export enum OrderType {
  DINE_IN = "DINE_IN",
  TAKEAWAY = "TAKEAWAY",
  DELIVERY = "DELIVERY",
}

export enum OrderStatus {
  DRAFT = "DRAFT", // New: For orders being built on the POS
  PENDING = "PENDING", // Order created but not processed
  SENT_TO_KITCHEN = "SENT_TO_KITCHEN", // Order sent to kitchen/bar
  READY = "READY", // Ready for pickup/serve
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export const decimal = z.union([z.string(), z.number()]);
// ===========================================
//       Schemas
// ===========================================

export const tenantSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  businessType: z.enum(BusinessType),
  settings: z.json().optional(),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().optional(),
});

//
// -------- Users ---------
//
export const userSchema = z.object({
  id: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.string(),
  isActive: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

export const categorySchema = z.object({
  id: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  code: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
});
export type Category = z.infer<typeof categorySchema>;

export const subcategorySchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  name: z.string(),
  description: z.string().nullable(),
  isDeleted: z.boolean().default(false),
  category: categorySchema.optional(),
});
export type Subcategory = z.infer<typeof subcategorySchema>;

export const recipeSchema = z.object({
  id: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  ingredientId: z.string().cuid().optional(),
  quantity: z.number(),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const productSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  price: decimal.nullable(),
  cost: decimal.nullable(),
  categoryId: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  isActive: z.boolean(),
  isDeleted: z.boolean(),
  isIngredient: z.boolean(),
  isModifiable: z.boolean(),
  taxId: z.string().nullable(),

  createdAt: z.string(),

  category: categorySchema.optional(),
  subcategory: subcategorySchema.optional(),
  recipesUsedIn: z.array(recipeSchema).optional(),
  ingredientUsedIn: z.array(recipeSchema).optional(),
});

//
// -------- Orders and Order Items ---------
//
export const orderItemSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  quantity: z.number(),
  unitPrice: decimal,
  taxRate: decimal,
  taxAmount: decimal,
  total: decimal,
  notes: z.string().nullable(),
  product: productSchema.optional(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().cuid().optional(),
  tenantId: z.string().cuid().optional(),
  userId: z.string().cuid(),
  branchId: z.string().cuid().nullable(),
  tableId: z.string().cuid().nullable(),
  deviceId: z.string().cuid().nullable(),
  shiftId: z.string().cuid().nullable(),
  customerId: z.string().cuid().nullable(),
  subtotal: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  discount: z.string().nullable(),
  orderNumber: z.string(),
  status: z.enum(OrderStatus).default(OrderStatus.DRAFT),
  type: z.enum(OrderType),
  items: z.array(orderItemSchema).optional(),

  createdAt: z.date().default(new Date()),
  completedAt: z.date().nullable(),
});
export type Order = z.infer<typeof orderSchema>;

// ===========================================
//         Query Params Schema
// ===========================================
export const queryParamsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(SortOrder).optional(),
});
export type QueryParams = z.infer<typeof queryParamsSchema>;

// ===========================================
//         Pagination Response Type
// ===========================================
export type PaginationResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};
