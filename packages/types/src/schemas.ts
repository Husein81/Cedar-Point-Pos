import { z } from "zod";
import { decimal, isoDate, uuid } from "./config";
import {
  BusinessType,
  CashMovementReferenceType,
  CashMovementType,
  InventoryChangeType,
  LoyaltyDirection,
  LoyaltyEnrollmentMode,
  LoyaltyTransactionType,
  ModifierType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PurchaseOrderStatus,
  ShiftCloseMode,
  ShiftCloseResult,
  ShiftScheduleStatus,
  ShiftStatus,
  SortOrder,
  TableStatus,
  TransferStatus,
  UserRole,
} from "./enums";

// Tenant
export const TenantSchema = z.object({
  id: uuid,
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
  id: uuid,
  tenantId: uuid,
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
  id: uuid,
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  avatar: z.string().url().nullable(),
  username: z.string(),
  password: z.string(),
  role: z.enum(UserRole),
  refreshToken: z.string().nullable(),
  isActive: z.boolean().default(true),
  createdAt: isoDate,
  updatedAt: isoDate,
  tenantId: uuid.nullable().optional(),
  tenant: TenantSchema.nullable().optional(),
});
export type User = z.infer<typeof UserSchema>;

export type PublicUser = Omit<User, "password">;

// Branch
export const BranchSchema = z.object({
  id: uuid,
  tenantId: uuid,
  name: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isDeleted: z.boolean().default(false),
});
export type Branch = z.infer<typeof BranchSchema>;

// POSDevice
export const POSDeviceSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  name: z.string(),
  token: z.string(),
  lastSync: isoDate.nullable().optional(),
  isActive: z.boolean().default(true),
  isKDS: z.boolean().default(false),
});
export type POSDevice = z.infer<typeof POSDeviceSchema>;

export const Color = z.object({
  id: uuid,
  name: z.string(),
  hex: z.string(),
  tenantId: uuid,
});
export type Color = z.infer<typeof Color>;

// Category
export const CategorySchema = z.object({
  id: uuid,
  tenantId: uuid,
  name: z.string(),
  code: z.string().nullable().optional(), // unique in prisma
  description: z.string().nullable().optional(),
  deletedAt: isoDate.nullable().optional(),
  colorId: uuid.nullable().optional(),
  color: Color.nullable().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

// Subcategory
export const SubcategorySchema = z.object({
  id: uuid,
  categoryId: uuid,
  name: z.string(),
  description: z.string().nullable().optional(),
  deletedAt: isoDate.nullable().optional(),
});
export type Subcategory = z.infer<typeof SubcategorySchema>;

// Product
export const ProductSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid.nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: decimal.nullable().optional(),
  cost: decimal.nullable().optional(),
  categoryId: uuid.nullable().optional(),
  category: CategorySchema.nullable().optional(),
  subcategoryId: uuid.nullable().optional(),
  isActive: z.boolean().default(true),
  deletedAt: isoDate.nullable().optional(),
  isModifiable: z.boolean().default(false),
  createdAt: isoDate,
  inventory: z
    .array(
      z.object({
        branchId: uuid,
        tenantId: uuid,
        stock: decimal.default("0"),
        minStock: decimal.default("0"),
      }),
    )
    .optional(),
});
export type Product = z.infer<typeof ProductSchema>;

// Offer / OfferGroup / OfferGroupItem
export const OfferSchema = z.object({
  id: uuid,
  tenantId: uuid,
  name: z.string(),
  basePrice: decimal,
  isActive: z.boolean().default(true),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Offer = z.infer<typeof OfferSchema>;

export const OfferGroupSchema = z.object({
  id: uuid,
  offerId: uuid,
  name: z.string(),
  freeItemsCount: z.number().int().nonnegative().default(0),
});
export type OfferGroup = z.infer<typeof OfferGroupSchema>;

export const OfferGroupItemSchema = z.object({
  id: uuid,
  offerGroupId: uuid,
  productId: uuid,
  extraPrice: decimal.default("0"),
});
export type OfferGroupItem = z.infer<typeof OfferGroupItemSchema>;

// Inventory
export const InventorySchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  productId: uuid,
  stock: decimal.default("0"),
  minStock: decimal.default("0"),
  lastAdjusted: isoDate,
});
export type Inventory = z.infer<typeof InventorySchema>;

// InventoryHistory
export const InventoryHistorySchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  productId: uuid,
  userId: uuid,
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
  id: uuid,
  tenantId: uuid,
  fromBranchId: uuid,
  toBranchId: uuid,
  status: z.enum(TransferStatus).default("PENDING"),
  requestedBy: uuid,
  approvedBy: uuid.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  completedAt: isoDate.nullable().optional(),
});
export type Transfer = z.infer<typeof TransferSchema>;

export const TransferItemSchema = z.object({
  id: uuid,
  transferId: uuid,
  productId: uuid,
  quantity: decimal,
});
export type TransferItem = z.infer<typeof TransferItemSchema>;

// Refund / RefundItem
export const RefundItemSchema = z.object({
  id: uuid.optional(),
  refundId: uuid.optional(),
  refund: z.object({
    id: uuid,
    orderId: uuid,
    totalAmount: decimal,
    reason: z.string().nullable().optional(),
    refundedAt: isoDate,
  }),
  orderItemId: uuid,
  quantity: decimal,
  unitPrice: decimal,
  subtotal: decimal,
});
export type RefundItem = z.infer<typeof RefundItemSchema>;

export const RefundSchema = z.object({
  id: uuid,
  orderId: uuid,
  totalAmount: decimal.default("0"),
  reason: z.string().nullable().optional(),
  refundedAt: isoDate,
  manualRefund: z.boolean().default(false),
  paymentMethod: z.string().nullable().optional(),
  loyaltyPointsRestored: z.number().int().default(0),
  loyaltyPointsReversed: z.number().int().default(0),
  // Shift attribution
  tenantId: uuid.nullable().optional(),
  branchId: uuid.nullable().optional(),
  shiftId: uuid.nullable().optional(),
  deviceId: uuid.nullable().optional(),
  userId: uuid.nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  items: z.array(RefundItemSchema).optional(),
  refundPayments: z.array(z.lazy(() => RefundPaymentSchema)).optional(),
});
export type Refund = z.infer<typeof RefundSchema>;

// Floor
export const FloorSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  name: z.string(),
  order: z.number().int().default(0),
  deletedAt: isoDate.nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Floor = z.infer<typeof FloorSchema>;

// Table
export const TableSchema = z.object({
  id: uuid,
  tableNumber: z.number().int(),
  tenantId: uuid,
  branchId: uuid,
  floorId: uuid.nullable().optional(),
  name: z.string(),
  capacity: z.number().int().positive().default(4),
  status: z.enum(TableStatus).default("AVAILABLE"),
  isActive: z.boolean().default(true),
  deletedAt: isoDate.nullable().optional(),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
  floor: FloorSchema.nullable().optional(), // Included when fetched with join
});
export type Table = z.infer<typeof TableSchema>;

// ModifierGroup / Modifier
export const ModifierGroupSchema = z.object({
  id: uuid,
  tenantId: uuid,
  name: z.string(),
  type: z.enum(ModifierType),
  deletedAt: isoDate.nullable().optional(),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const ModifierSchema = z.object({
  id: uuid,
  tenantId: uuid,
  groupId: uuid,
  productId: uuid.nullable().optional(),
  name: z.string(),
  price: decimal.default("0"),
  deletedAt: isoDate.nullable().optional(),
});
export type Modifier = z.infer<typeof ModifierSchema>;

// OrderItem
export const OrderItemSchema = z.object({
  id: uuid,
  orderId: uuid,
  productId: uuid,
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
        id: uuid,
        orderItemId: uuid,
        modifierId: uuid,
        modifier: ModifierSchema.optional(), // For modifier details
        price: decimal,
      }),
    )
    .optional(), // OrderItemModifier[]
  tickets: z
    .array(
      z.object({
        id: uuid,
        orderItemId: uuid,
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
  id: uuid,
  tenantId: uuid,
  userId: uuid.nullable().optional(),
  branchId: uuid,
  tableId: uuid.nullable().optional(),
  table: TableSchema.optional(),
  deviceId: uuid.nullable().optional(),
  customerId: uuid.nullable().optional(),
  orderNumber: z.string().nullable().optional(),
  customer: z
    .object({
      id: uuid,
      name: z.string(),
      phone: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  shiftId: uuid.nullable().optional(),
  refunds: z.array(RefundSchema).optional(),
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
  id: uuid,
  orderItemId: uuid,
  station: z.string().nullable().optional(),
  status: z.enum(OrderStatus).default("SENT_TO_KITCHEN"),
  sentAt: isoDate,
  bumpedAt: isoDate.nullable().optional(),
});
export type OrderItemTicket = z.infer<typeof OrderItemTicketSchema>;

// OrderItemModifier
export const OrderItemModifierSchema = z.object({
  id: uuid,
  orderItemId: uuid,
  modifierId: uuid,
  price: decimal,
});
export type OrderItemModifier = z.infer<typeof OrderItemModifierSchema>;

// Payment
export const PaymentSchema = z.object({
  id: uuid,
  orderId: uuid,
  method: z.enum(PaymentMethod),
  currencyCode: z.string().default("USD"),
  amount: decimal,
  exchangeRate: decimal.nullable().optional(),
  transactionId: z.string().nullable().optional(),
  paidAt: isoDate,
  // Shift attribution
  shiftId: uuid.nullable().optional(),
  deviceId: uuid.nullable().optional(),
  userId: uuid.nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// Customer
export const CustomerSchema = z.object({
  id: uuid,
  tenantId: uuid,
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  deletedAt: isoDate.nullable().optional(),
  loyaltyAccount: z
    .lazy(() => LoyaltyAccountSchema)
    .nullable()
    .optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

// Supplier
export const SupplierSchema = z.object({
  id: uuid,
  tenantId: uuid,
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
  deletedAt: isoDate.nullable().optional(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

// PurchaseOrder
export const PurchaseOrderSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  supplierId: uuid,
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
  id: uuid,
  purchaseOrderId: uuid,
  productId: uuid,
  quantity: decimal,
  unitCost: decimal,
  totalCost: decimal,
  notes: z.string().nullable().optional(),
  product: ProductSchema.pick({
    id: true,
    name: true,
    sku: true,
    barcode: true,
  }).optional(),
});
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

// Shift
export const ShiftSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  userId: uuid,
  deviceId: uuid.nullable().optional(),
  startTime: isoDate,
  endTime: isoDate.nullable().optional(),
  startCash: decimal.default("0"),
  endCash: decimal.nullable().optional(),
  actualCash: decimal.nullable().optional(),
  difference: decimal.nullable().optional(),
  status: z.enum(ShiftStatus).default("OPEN"),
  notes: z.string().nullable().optional(),
  // Close-related fields
  closedById: uuid.nullable().optional(),
  closeMode: z.enum(ShiftCloseMode).nullable().optional(),
  closeResult: z.enum(ShiftCloseResult).nullable().optional(),
  varianceAmount: decimal.nullable().optional(),
  variancePercent: decimal.nullable().optional(),
  approvedById: uuid.nullable().optional(),
  approvalNote: z.string().nullable().optional(),
  // Schedule linkage
  scheduleId: uuid.nullable().optional(),
});
export type Shift = z.infer<typeof ShiftSchema>;

// ShiftSchedule (Planned Shifts)
export const ShiftScheduleSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  userId: uuid,
  deviceId: uuid.nullable().optional(),
  date: isoDate,
  startTime: isoDate,
  endTime: isoDate,
  notes: z.string().nullable().optional(),
  status: z.enum(ShiftScheduleStatus).default("DRAFT"),
  publishedAt: isoDate.nullable().optional(),
  publishedById: uuid.nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type ShiftSchedule = z.infer<typeof ShiftScheduleSchema>;

// RefundPayment
export const RefundPaymentSchema = z.object({
  id: uuid,
  refundId: uuid,
  method: z.enum(PaymentMethod),
  amount: decimal,
  currencyCode: z.string().nullable().optional(),
  exchangeRate: decimal.nullable().optional(),
  shiftId: uuid.nullable().optional(),
  deviceId: uuid.nullable().optional(),
  userId: uuid.nullable().optional(),
  createdAt: isoDate,
});
export type RefundPayment = z.infer<typeof RefundPaymentSchema>;

// CashMovement
export const CashMovementSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  shiftId: uuid,
  deviceId: uuid.nullable().optional(),
  userId: uuid,
  type: z.enum(CashMovementType),
  amount: decimal,
  reason: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
  referenceType: z.enum(CashMovementReferenceType).nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  createdAt: isoDate,
});
export type CashMovement = z.infer<typeof CashMovementSchema>;

// ===========================================
//         Loyalty Schemas
// ===========================================

// LoyaltyProgram
export const LoyaltyProgramSchema = z.object({
  id: uuid,
  tenantId: uuid,
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
  id: uuid,
  tenantId: uuid,
  customerId: uuid,
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
  id: uuid,
  tenantId: uuid,
  accountId: uuid,
  customerId: uuid,
  orderId: uuid.nullable().optional(),
  refundId: uuid.nullable().optional(),
  type: z.enum(LoyaltyTransactionType),
  direction: z.enum(LoyaltyDirection),
  points: z.number().int(),
  moneyAmount: decimal.nullable().optional(),
  balanceAfter: z.number().int(),
  idempotencyKey: z.string(),
  reason: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  actorUserId: uuid.nullable().optional(),
  createdAt: isoDate,
});
export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>;

// OrderSequence
export const OrderSequenceSchema = z.object({
  id: uuid,
  tenantId: uuid,
  branchId: uuid,
  date: z.string(),
  lastValue: z.number().int().default(0),
  updatedAt: isoDate,
});
export type OrderSequence = z.infer<typeof OrderSequenceSchema>;

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
