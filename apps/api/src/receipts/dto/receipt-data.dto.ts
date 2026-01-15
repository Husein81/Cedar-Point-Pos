import { z } from 'zod';

/**
 * Receipt Data DTO
 *
 * This is the complete data structure for rendering a receipt.
 * All data is flattened and ready for display - no additional
 * queries should be needed on the frontend.
 */

// Tenant/Branch Info
export const receiptTenantDto = z.object({
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  logoUrl: z.string().nullable(),
  businessType: z.enum(['RETAIL', 'RESTAURANT']),
});
export type ReceiptTenantDto = z.infer<typeof receiptTenantDto>;

export const receiptBranchDto = z.object({
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
});
export type ReceiptBranchDto = z.infer<typeof receiptBranchDto>;

// Order Info
export const receiptOrderDto = z.object({
  id: z.string(),
  orderNumber: z.string(),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'RETAIL']),
  status: z.string(),
  createdAt: z.string(), // ISO date string
  completedAt: z.string().nullable(),
  tableNumber: z.number().nullable(),
  tableName: z.string().nullable(),
});
export type ReceiptOrderDto = z.infer<typeof receiptOrderDto>;

// Cashier Info
export const receiptCashierDto = z.object({
  id: z.string(),
  name: z.string(),
});
export type ReceiptCashierDto = z.infer<typeof receiptCashierDto>;

// Customer Info
export const receiptCustomerDto = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});
export type ReceiptCustomerDto = z.infer<typeof receiptCustomerDto>;

// Item Modifier
export const receiptModifierDto = z.object({
  name: z.string(),
  price: z.number(),
});
export type ReceiptModifierDto = z.infer<typeof receiptModifierDto>;

// Order Item
export const receiptItemDto = z.object({
  id: z.string(),
  productName: z.string(),
  productSku: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
  notes: z.string().nullable(),
  modifiers: z.array(receiptModifierDto),
});
export type ReceiptItemDto = z.infer<typeof receiptItemDto>;

// Payment
export const receiptPaymentDto = z.object({
  id: z.string(),
  method: z.enum(['CASH', 'CARD', 'CREDIT', 'VOUCHER', 'ONLINE']),
  amount: z.number(),
  currencyCode: z.string(),
  currencySymbol: z.string(),
  exchangeRate: z.number().nullable(),
  // Converted amount in base currency (for multi-currency receipts)
  amountInBaseCurrency: z.number(),
  paidAt: z.string(), // ISO date string
});
export type ReceiptPaymentDto = z.infer<typeof receiptPaymentDto>;

// Totals
export const receiptTotalsDto = z.object({
  subtotal: z.number(),
  discount: z.number(),
  discountPercentage: z.number().nullable(), // If percentage-based
  shippingFee: z.number(),
  tax: z.number(), // Future: TVA support
  total: z.number(),
  totalPaid: z.number(),
  change: z.number(), // Cash change due
  balance: z.number(), // Remaining balance (for partial payments)
});
export type ReceiptTotalsDto = z.infer<typeof receiptTotalsDto>;

// Currency Info
export const receiptCurrencyDto = z.object({
  baseCurrencyCode: z.string(),
  baseCurrencySymbol: z.string(),
  decimalPlaces: z.number(),
});
export type ReceiptCurrencyDto = z.infer<typeof receiptCurrencyDto>;

// Footer
export const receiptFooterDto = z.object({
  thankYouMessage: z.string(),
  footerText: z.string().nullable(),
});
export type ReceiptFooterDto = z.infer<typeof receiptFooterDto>;

// Complete Receipt Data
export const receiptDataDto = z.object({
  // Metadata
  receiptId: z.string(), // Unique receipt identifier
  isReprint: z.boolean(),
  printedAt: z.string(), // ISO date string
  printCount: z.number(),

  // Business Info
  tenant: receiptTenantDto,
  branch: receiptBranchDto,

  // Order Details
  order: receiptOrderDto,
  cashier: receiptCashierDto.nullable(),
  customer: receiptCustomerDto.nullable(),

  // Line Items
  items: z.array(receiptItemDto),

  // Financial
  totals: receiptTotalsDto,
  payments: z.array(receiptPaymentDto),
  currency: receiptCurrencyDto,

  // Footer
  footer: receiptFooterDto,
});
export type ReceiptDataDto = z.infer<typeof receiptDataDto>;

// Query params for receipt endpoint
export const getReceiptQueryDto = z.object({
  isReprint: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});
export type GetReceiptQueryDto = z.infer<typeof getReceiptQueryDto>;
