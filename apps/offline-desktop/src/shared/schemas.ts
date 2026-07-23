// Zod schemas shared by both sides of the IPC boundary:
// - main process: every IPC handler parses its input with these (security)
// - renderer: React Hook Form resolvers reuse the same schemas (DRY)

import { z } from "zod";
import {
  CashMovementType,
  DiscountType,
  PaymentMethod,
  UserRole,
} from "./enums";

// ── primitives ────────────────────────────────────────────────────────

export const IdSchema = z.string().min(1);

const money = z.number().finite().nonnegative();
const quantity = z.number().finite().positive();

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1),
});

// ── auth / users ──────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dots, dashes only"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  role: z.enum([UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER]),
});
export type UserInput = z.infer<typeof UserSchema>;

export const UpdateUserSchema = UserSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ── colors ────────────────────────────────────────────────────────────

export const ColorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color (e.g. #FF0000)"),
});
export type ColorInput = z.infer<typeof ColorSchema>;
// ── categories ────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  // References a row in the shared colors palette (see ColorSchema) — the
  // category never owns its own color, it points at one.
  colorId: IdSchema.nullable().default(null),
  sortOrder: z.number().int().default(0),
});
export type CategoryInput = z.infer<typeof CategorySchema>;

// ── products ──────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: money,
  cost: money.default(0),
  stock: z.number().finite().default(0),
  trackInventory: z.boolean().default(true),
  lowStockThreshold: z.number().finite().nullable().optional(),
  categoryId: IdSchema.nullable().optional(),
  imagePath: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof ProductSchema>;

export const ListProductsSchema = PaginationSchema.extend({
  search: z.string().optional(),
  categoryId: IdSchema.optional(),
  activeOnly: z.boolean().default(false),
  lowStockOnly: z.boolean().default(false),
});
export type ListProductsInput = z.infer<typeof ListProductsSchema>;

// ── customers ─────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().nullable().optional(),
  // Empty string counts as "no email" — validated only when present.
  email: z
    .string()
    .nullable()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Invalid email",
    ),
  address: z.string().nullable().optional(),
});
export type CustomerInput = z.infer<typeof CustomerSchema>;

export const ListCustomersSchema = PaginationSchema.extend({
  search: z.string().optional(),
});
export type ListCustomersInput = z.infer<typeof ListCustomersSchema>;

// ── orders / checkout ─────────────────────────────────────────────────

const DiscountTypeSchema = z.enum([DiscountType.PERCENT, DiscountType.FIXED]);

export const CartItemSchema = z.object({
  productId: IdSchema,
  quantity,
  unitPrice: money,
  discountType: DiscountTypeSchema.nullable().default(null),
  discountValue: money.default(0),
  note: z.string().nullable().default(null),
});
export type CartItemInput = z.infer<typeof CartItemSchema>;

export const PaymentInputSchema = z.object({
  method: z.enum([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.OTHER]),
  amount: money,
});
export type PaymentInput = z.infer<typeof PaymentInputSchema>;

export const CheckoutSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart is empty"),
  payments: z.array(PaymentInputSchema).min(1, "At least one payment"),
  customerId: IdSchema.nullable().default(null),
  discountType: DiscountTypeSchema.nullable().default(null),
  discountValue: money.default(0),
  note: z.string().nullable().default(null),
  heldOrderId: IdSchema.nullable().default(null),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const HoldOrderSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Cart is empty"),
  customerId: IdSchema.nullable().default(null),
  discountType: DiscountTypeSchema.nullable().default(null),
  discountValue: money.default(0),
  note: z.string().nullable().default(null),
});
export type HoldOrderInput = z.infer<typeof HoldOrderSchema>;

export const ListOrdersSchema = PaginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;

export const RefundSchema = z.object({
  orderId: IdSchema,
  items: z
    .array(z.object({ orderItemId: IdSchema, quantity }))
    .min(1, "Select at least one item"),
  reason: z.string().nullable().default(null),
});
export type RefundInput = z.infer<typeof RefundSchema>;

// ── inventory ─────────────────────────────────────────────────────────

export const StockAdjustmentSchema = z.object({
  productId: IdSchema,
  // positive = add stock, negative = remove
  quantity: z
    .number()
    .finite()
    .refine((value) => value !== 0, "Quantity cannot be zero"),
  reason: z.string().min(1, "Reason is required"),
});
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export const StockPurchaseSchema = z.object({
  items: z
    .array(
      z.object({
        productId: IdSchema,
        quantity,
        unitCost: money,
      }),
    )
    .min(1, "Add at least one line"),
  reference: z.string().nullable().default(null),
});
export type StockPurchaseInput = z.infer<typeof StockPurchaseSchema>;

export const ListStockMovementsSchema = PaginationSchema.extend({
  productId: IdSchema.optional(),
  type: z.string().optional(),
});
export type ListStockMovementsInput = z.infer<typeof ListStockMovementsSchema>;

// ── shifts / cash register ────────────────────────────────────────────

export const OpenShiftSchema = z.object({
  openingFloat: money,
  note: z.string().nullable().default(null),
});
export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;

export const CloseShiftSchema = z.object({
  actualCash: money,
  note: z.string().nullable().default(null),
});
export type CloseShiftInput = z.infer<typeof CloseShiftSchema>;

export const CashMovementSchema = z.object({
  type: z.enum([CashMovementType.CASH_IN, CashMovementType.CASH_OUT]),
  amount: quantity,
  reason: z.string().min(1, "Reason is required"),
});
export type CashMovementInput = z.infer<typeof CashMovementSchema>;

// ── settings ──────────────────────────────────────────────────────────

export const UpdateSettingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  currencyCode: z.string().min(1).optional(),
  currencySymbol: z.string().min(1).optional(),
  receiptFooter: z.string().nullable().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  logoPath: z.string().nullable().optional(),
  invoicePrefix: z.string().min(1).optional(),
  nextInvoiceNumber: z.number().int().min(1).optional(),
  printerName: z.string().nullable().optional(),
  receiptWidthMm: z.number().int().optional(),
  theme: z.string().optional(),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
