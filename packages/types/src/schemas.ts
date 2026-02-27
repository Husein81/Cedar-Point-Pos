import { z } from "zod";
import { decimal, isoDate, cuid } from "./config";
import {
  BusinessType,
  InventoryChangeType,
  LoyaltyDirection,
  LoyaltyEnrollmentMode,
  LoyaltyTransactionType,
  ModifierType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PurchaseOrderItemType,
  ShiftStatus,
  SortOrder,
  TableStatus,
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

// Currency (Reference Table)
export const CurrencySchema = z.object({
  code: z.string().min(1), // ISO 4217 code: USD, EUR, LBP
  name: z.string(), // Full name: "United States Dollar"
  symbol: z.string().nullable().optional(), // Display symbol: "$", "€", "ل.ل"
  decimalPlaces: z.number().int().default(2), // Number of decimal places
});
export type Currency = z.infer<typeof CurrencySchema>;

// TenantCurrency (Tenant-Scoped Currency Config)
export const TenantCurrencySchema = z.object({
  id: cuid,
  tenantId: cuid,
  currencyCode: z.string(), // ISO 4217 code
  exchangeRate: decimal, // Rate relative to base currency
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false), // True for base currency
  createdAt: isoDate,
  updatedAt: isoDate,
  currency: CurrencySchema.optional(), // Included when fetched with join
});
export type TenantCurrency = z.infer<typeof TenantCurrencySchema>;

// Response type for getTenantCurrencies
export const TenantCurrenciesResponseSchema = z.object({
  baseCurrencyCode: z.string(),
  currencies: z.array(TenantCurrencySchema),
});
export type TenantCurrenciesResponse = z.infer<
  typeof TenantCurrenciesResponseSchema
>;

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

export const Color = z.object({
  id: cuid,
  name: z.string(),
  hex: z.string(),
  tenantId: cuid,
});
export type Color = z.infer<typeof Color>;

// Category
export const CategorySchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  code: z.string().nullable().optional(), // unique in prisma
  description: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
  colorId: cuid.nullable().optional(),
  color: Color.nullable().optional(),
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
  category: CategorySchema.nullable().optional(),
  subcategoryId: cuid.nullable().optional(),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  isModifiable: z.boolean().default(false),
  createdAt: isoDate,
  inventory: z
    .array(
      z.object({
        branchId: cuid,
        tenantId: cuid,
        stock: decimal.default("0"),
        minStock: decimal.default("0"),
      }),
    )
    .optional(),
});
export type Product = z.infer<typeof ProductSchema>;

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
  refund: z.object({
    id: cuid,
    orderId: cuid,
    totalAmount: decimal,
    reason: z.string().nullable().optional(),
    refundedAt: isoDate,
  }),
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
  manualRefund: z.boolean().default(false),
  paymentMethod: z.string().nullable().optional(),
  loyaltyPointsRestored: z.number().int().default(0),
  loyaltyPointsReversed: z.number().int().default(0),
  items: z.array(RefundItemSchema).optional(),
});
export type Refund = z.infer<typeof RefundSchema>;

// Floor
export const FloorSchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  name: z.string(),
  order: z.number().int().default(0),
  isDeleted: z.boolean().default(false),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Floor = z.infer<typeof FloorSchema>;

// Table
export const TableSchema = z.object({
  id: cuid,
  tableNumber: z.number().int(),
  tenantId: cuid,
  branchId: cuid,
  floorId: cuid.nullable().optional(),
  name: z.string(),
  capacity: z.number().int().positive().default(4),
  status: z.enum(TableStatus).default("AVAILABLE"),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
  floor: FloorSchema.nullable().optional(), // Included when fetched with join
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
  subtotal: decimal.optional(),
  total: decimal,
  notes: z.string().nullable().optional(),
  discount: z
    .object({
      type: z.enum(["PERCENTAGE", "FIXED"]),
      value: z.number(),
    })
    .nullable()
    .optional(),
  product: ProductSchema.optional(), // For combo products
  modifiers: z
    .array(
      z.object({
        id: cuid,
        orderItemId: cuid,
        modifierId: cuid,
        modifier: ModifierSchema.optional(), // For modifier details
        price: decimal,
      }),
    )
    .optional(), // OrderItemModifier[]
  tickets: z
    .array(
      z.object({
        id: cuid,
        orderItemId: cuid,
        station: z.string().nullable().optional(),
        status: z.enum(OrderStatus).default("SENT_TO_KITCHEN"),
        sentAt: isoDate,
        bumpedAt: isoDate.nullable().optional(),
      }),
    )
    .optional(), // OrderItemTicket[]
  refundItems: z.array(RefundItemSchema).optional(), // RefundItem[]
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Order
export const OrderSchema = z.object({
  id: cuid,
  tenantId: cuid,
  userId: cuid.nullable().optional(),
  branchId: cuid,
  tableId: cuid.nullable().optional(),
  table: TableSchema.optional(),
  deviceId: cuid.nullable().optional(),
  customerId: cuid.nullable().optional(),
  customer: z
    .object({
      id: cuid,
      name: z.string(),
      phone: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  shiftId: cuid.nullable().optional(),
  refunds: z.array(RefundSchema).optional(),
  orderNumber: z.string().nullable().optional(),
  type: z.enum(OrderType),
  status: z.enum(OrderStatus).default("DRAFT"),
  vat: decimal.nullable().optional(),
  includeVAT: z.boolean().default(false),
  shippingFee: decimal.nullable().optional(),
  subtotal: decimal.default("0"),
  total: decimal.default("0"),
  discount: decimal.nullable().optional(),

  // Currency snapshot (for reporting)
  currencyCode: z.string().nullable().optional().default("USD"),
  exchangeRate: decimal.nullable().optional(),

  // Loyalty fields
  loyaltyRedeemedPoints: z.number().int().default(0),
  loyaltyRedeemedAmount: decimal.default("0"),
  loyaltyEarnedPoints: z.number().int().default(0),
  loyaltyEligibleBaseAtCompletion: decimal.default("0"),
  loyaltyRedeemBaseAtCompletion: decimal.default("0"),
  loyaltyProgramSnapshot: z.unknown().nullable().optional(),
  loyaltyCompletedAt: isoDate.nullable().optional(),

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
  loyaltyAccount: z.lazy(() => LoyaltyAccountSchema).nullable().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// Supplier
export const SupplierSchema = z.object({
  id: cuid,
  tenantId: cuid,
  name: z.string(),
  companyName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  currentBalance: z.number().default(0),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Supplier = z.infer<typeof SupplierSchema>;

// PurchaseOrder
export const PurchaseOrderSchema = z.object({
  id: cuid,
  tenantId: cuid,
  branchId: cuid,
  supplierId: cuid,
  orderNumber: z.string().nullable().optional(),
  totalAmount: z.number().default(0),
  status: z
    .enum(["PENDING", "ORDERED", "RECEIVED", "CANCELLED"])
    .default("PENDING"),
  notes: z.string().nullable().optional(),
  orderedAt: isoDate,
  receivedAt: isoDate.nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  items: z.array(z.lazy(() => PurchaseOrderItemSchema)).optional(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

// PurchaseOrderItem
export const PurchaseOrderItemSchema = z.object({
  id: cuid,
  purchaseOrderId: cuid,
  itemType: z.enum(PurchaseOrderItemType),
  productId: cuid.nullable(),
  itemName: z.string(),
  quantity: decimal,
  unitCost: decimal,
  totalCost: decimal,
  notes: z.string().nullable().optional(),
  product: ProductSchema.pick({
    id: true,
    name: true,
    sku: true,
    barcode: true,
  })
    .nullable()
    .optional(),
});
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

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

// ===========================================
//         Loyalty Schemas
// ===========================================

// LoyaltyProgram
export const LoyaltyProgramSchema = z.object({
  id: cuid,
  tenantId: cuid,
  isEnabled: z.boolean().default(false),
  enrollmentMode: z.enum(LoyaltyEnrollmentMode).default("AUTO"),
  earnPointsPerCurrency: decimal.nullable().optional(),
  redeemPointsStep: z.number().int().nullable().optional(),
  redeemCurrencyPerStep: decimal.nullable().optional(),
  minRedeemPoints: z.number().int().default(0),
  maxRedeemPercent: decimal.nullable().optional(),
  allowNoCustomerAccrual: z.boolean().default(false),
  pointsExpirationDays: z.number().int().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type LoyaltyProgram = z.infer<typeof LoyaltyProgramSchema>;

// LoyaltyAccount
export const LoyaltyAccountSchema = z.object({
  id: cuid,
  tenantId: cuid,
  customerId: cuid,
  pointsBalance: z.number().int().default(0),
  lifetimeEarned: z.number().int().default(0),
  lifetimeRedeemed: z.number().int().default(0),
  lifetimeRestored: z.number().int().default(0),
  lifetimeReversed: z.number().int().default(0),
  lifetimeAdjusted: z.number().int().default(0),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type LoyaltyAccount = z.infer<typeof LoyaltyAccountSchema>;

// LoyaltyTransaction
export const LoyaltyTransactionSchema = z.object({
  id: cuid,
  tenantId: cuid,
  accountId: cuid,
  customerId: cuid,
  orderId: cuid.nullable().optional(),
  refundId: cuid.nullable().optional(),
  type: z.enum(LoyaltyTransactionType),
  direction: z.enum(LoyaltyDirection),
  points: z.number().int(),
  moneyAmount: decimal.nullable().optional(),
  balanceAfter: z.number().int(),
  idempotencyKey: z.string(),
  reason: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  actorUserId: cuid.nullable().optional(),
  createdAt: isoDate,
});
export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>;

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
