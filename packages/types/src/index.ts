import z from "zod";

// ===========================================
//         Enums
// ===========================================
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

// ===========================================
//       Schemas
// ===========================================

//
// -------- Users ---------
//
export const userSchema = z.object({
  id: z.string().cuid(),
  tenantId: z.string().cuid().optional(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.string(),
  isActive: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

//
// -------- Orders and Order Items ---------
//
export const orderItemSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number(),
  unitPrice: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  notes: z.string().nullable(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().cuid(),
  tenantId: z.string().cuid(),
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
