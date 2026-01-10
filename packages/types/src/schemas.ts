import { z } from "zod";
import { decimal, isoDate, cuid } from "./config";
import {
  BusinessType,
  InventoryChangeType,
  ModifierType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  ShiftStatus,
  SortOrder,
  TransferStatus,
  UserRole,
} from "./enums";

// Tenant
export const TenantSchema = z.object({
  id: cuid,
  name: z.string(),
  businessType: BusinessType,
  createdAt: isoDate,
  updatedAt: isoDate,
  settings: z.unknown().nullable().optional(), // Json?
});
export type Tenant = z.infer<typeof TenantSchema>;

// Currency
export const CurrencySchema = z.object({
  code: z.string().min(1), // e.g., USD
  name: z.string(),
  symbol: z.string().nullable().optional(),
  exchangeRate: decimal.nullable().optional(),
  isActive: z.boolean().default(true),
});
export type Currency = z.infer<typeof CurrencySchema>;

// User
export const UserSchema = z.object({
  id: cuid,
  name: z.string(),
  username: z.string(),
  password: z.string(), // usually not returned in responses; keep for internal/admin usage
  role: z.enum(UserRole),
  isActive: z.boolean().default(true),
  createdAt: isoDate,
  updatedAt: isoDate,
  tenantId: cuid.nullable().optional(),
  tenant: TenantSchema.nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

// Branch
export const BranchSchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
});
export type Branch = z.infer<typeof BranchSchema>;

// POSDevice
export const POSDeviceSchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  name: z.string(),
  token: z.string(),
  lastSync: isoDate.nullable().optional(),
  isActive: z.boolean().default(true),
  isKDS: z.boolean().default(false),
});
export type POSDevice = z.infer<typeof POSDeviceSchema>;

// Category
export const CategorySchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  code: z.string().nullable().optional(), // unique in prisma
  description: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
});
export type Category = z.infer<typeof CategorySchema>;

// Subcategory
export const SubcategorySchema = z.object({
  id: cuid,
  categoryId: cuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
});
export type Subcategory = z.infer<typeof SubcategorySchema>;

// Recipe
export const RecipeSchema = z.object({
  id: cuid,
  tenantId: cuid,
  productId: cuid,
  ingredientId: cuid,
  ingredient: z
    .object({
      id: cuid,
      name: z.string(),
      sku: z.string().nullable().optional(),
      unit: z.string().nullable().optional(),
    })
    .optional(), // For ingredient details
  quantity: decimal,
});
export type Recipe = z.infer<typeof RecipeSchema>;

// Product
export const ProductSchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid.nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: decimal.nullable().optional(),
  cost: decimal.nullable().optional(),
  categoryId: cuid.nullable().optional(),
  subcategoryId: cuid.nullable().optional(),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  isIngredient: z.boolean().default(false),
  isModifiable: z.boolean().default(false),
  createdAt: isoDate,
  taxId: cuid.nullable().optional(),

  inventory: z
    .array(
      z.object({
        branchId: cuid,
        tenantId: cuid,
        stock: decimal.default("0"),
        minStock: decimal.default("0"),
      })
    )
    .optional(),
  recipesUsedIn: z.array(RecipeSchema).optional(), // For ingredients
});
export type Product = z.infer<typeof ProductSchema>;

// Offer / OfferGroup / OfferGroupItem
export const OfferSchema = z.object({
  id: cuid,
  name: z.string(),
  basePrice: decimal,
});
export type Offer = z.infer<typeof OfferSchema>;

export const OfferGroupSchema = z.object({
  id: cuid,
  offerId: cuid,
  name: z.string(),
  freeItemsCount: z.number().int().nonnegative().default(0),
});
export type OfferGroup = z.infer<typeof OfferGroupSchema>;

export const OfferGroupItemSchema = z.object({
  id: cuid,
  offerGroupId: cuid,
  productId: cuid,
  extraPrice: decimal.default("0"),
});
export type OfferGroupItem = z.infer<typeof OfferGroupItemSchema>;

// Inventory
export const InventorySchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  productId: cuid,
  stock: decimal.default("0"),
  minStock: decimal.default("0"),
  lastAdjusted: isoDate,
});
export type Inventory = z.infer<typeof InventorySchema>;

// InventoryHistory
export const InventoryHistorySchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  productId: cuid,
  userId: cuid,
  changeType: z.enum(InventoryChangeType),
  beforeStock: decimal,
  afterStock: decimal,
  adjustment: decimal,
  beforeMinStock: decimal.nullable().optional(),
  afterMinStock: decimal.nullable().optional(),
  reason: z.string().nullable().optional(),
  createdAt: isoDate,
});
export type InventoryHistory = z.infer<typeof InventoryHistorySchema>;

// Transfer / TransferItem
export const TransferSchema = z.object({
  id: cuid,
  tenantId: cuid,
  fromBranchId: cuid,
  toBranchId: cuid,
  status: z.enum(TransferStatus).default("PENDING"),
  requestedBy: cuid,
  approvedBy: cuid.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: isoDate.nullable().optional(),
});
export type Transfer = z.infer<typeof TransferSchema>;

export const TransferItemSchema = z.object({
  id: cuid,
  transferId: cuid,
  productId: cuid,
  quantity: decimal,
});
export type TransferItem = z.infer<typeof TransferItemSchema>;

// Refund / RefundItem
export const RefundItemSchema = z.object({
  id: cuid.optional(),
  refundId: cuid.optional(),
  orderItemId: cuid,
  quantity: decimal,
  unitPrice: decimal,
  subtotal: decimal,
});
export type RefundItem = z.infer<typeof RefundItemSchema>;

export const RefundSchema = z.object({
  id: cuid,
  orderId: cuid,
  totalAmount: decimal.default("0"),
  reason: z.string().nullable().optional(),
  refundedAt: isoDate,
  items: z.array(RefundItemSchema).optional(),
});
export type Refund = z.infer<typeof RefundSchema>;

// Table
export const TableSchema = z.object({
  id: cuid,
  tableNumber: z.number().int(),
  tenantId: cuid,
  branchId: cuid,
  name: z.string(),
  capacity: z.number().int().positive().default(4),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
});
export type Table = z.infer<typeof TableSchema>;

// ModifierGroup / Modifier
export const ModifierGroupSchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  type: z.enum(ModifierType),
  isDeleted: z.boolean().default(false),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const ModifierSchema = z.object({
  id: cuid,
  tenantId: cuid,
  groupId: cuid,
  productId: cuid.nullable().optional(),
  name: z.string(),
  price: decimal.default("0"),
  isDeleted: z.boolean().default(false),
});
export type Modifier = z.infer<typeof ModifierSchema>;

// OrderItem
export const OrderItemSchema = z.object({
  id: cuid,
  orderId: cuid,
  productId: cuid,
  quantity: decimal.default("1"),
  unitPrice: decimal,
  taxRate: decimal.default("0"),
  taxAmount: decimal.default("0"),
  total: decimal,
  notes: z.string().nullable().optional(),
  product: ProductSchema.optional(), // For combo products
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Order
export const OrderSchema = z.object({
  id: cuid,
  tenantId: cuid,
  userId: cuid.nullable().optional(),
  branchId: cuid,
  tableId: cuid.nullable().optional(),
  deviceId: cuid.nullable().optional(),

  customerId: cuid.nullable().optional(),
  shiftId: cuid.nullable().optional(),

  orderNumber: z.string().nullable().optional(),

  type: z.enum(OrderType),
  status: z.enum(OrderStatus).default("DRAFT"),

  subtotal: decimal.default("0"),
  taxAmount: decimal.default("0"),
  total: decimal.default("0"),
  discount: decimal.nullable().optional(),

  createdAt: isoDate,
  completedAt: isoDate.nullable().optional(),
  items: z.array(OrderItemSchema).optional(), // OrderItem[]
});
export type Order = z.infer<typeof OrderSchema>;

// OrderItemTicket
export const OrderItemTicketSchema = z.object({
  id: cuid,
  orderItemId: cuid,
  station: z.string().nullable().optional(),
  status: z.enum(OrderStatus).default("SENT_TO_KITCHEN"),
  sentAt: isoDate,
  bumpedAt: isoDate.nullable().optional(),
});
export type OrderItemTicket = z.infer<typeof OrderItemTicketSchema>;

// OrderItemModifier
export const OrderItemModifierSchema = z.object({
  id: cuid,
  orderItemId: cuid,
  modifierId: cuid,
  price: decimal,
});
export type OrderItemModifier = z.infer<typeof OrderItemModifierSchema>;

// Payment
export const PaymentSchema = z.object({
  id: cuid,
  orderId: cuid,
  method: z.enum(PaymentMethod),
  currencyCode: z.string().default("USD"),
  amount: decimal,
  exchangeRate: decimal.nullable().optional(),
  transactionId: z.string().nullable().optional(),
  paidAt: isoDate,
});
export type Payment = z.infer<typeof PaymentSchema>;

// Customer
export const CustomerSchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Customer = z.infer<typeof CustomerSchema>;

// Shift
export const ShiftSchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  userId: cuid,
  deviceId: cuid.nullable().optional(),
  startTime: isoDate,
  endTime: isoDate.nullable().optional(),
  startCash: decimal.default("0"),
  endCash: decimal.nullable().optional(),
  actualCash: decimal.nullable().optional(),
  difference: decimal.nullable().optional(),
  status: z.enum(ShiftStatus).default("OPEN"),
  notes: z.string().nullable().optional(),
});
export type Shift = z.infer<typeof ShiftSchema>;

// Tax
export const TaxSchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  rate: decimal, // Decimal(5,2)
  isDefault: z.boolean().default(false),
});
export type Tax = z.infer<typeof TaxSchema>;

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
