import type { Order, TenantCurrency } from "@repo/types";
import { VAT_RATE_PERCENT_LABEL } from "@/constants/finance";
import { DEFAULT_LOCALE } from "@/constants/locale";

// ─── Types ───────────────────────────────────────────────────────

export interface CurrencyAmount {
  /** Formatted string with symbol, e.g. "1,200.00 $" */
  formatted: string;
  /** Raw numeric value */
  value: number;
  /** Currency code, e.g. "USD" */
  code: string;
}

export interface InvoiceFinancials {
  /** Sum of item totals before discount and tax */
  subtotal: number;
  /** Order-level discount amount (always positive) */
  discount: number;
  /** Whether VAT is applied */
  hasVat: boolean;
  /** VAT percentage label, e.g. "11%" */
  vatLabel: string;
  /** VAT amount */
  vatAmount: number;
  /** Shipping fee */
  shippingFee: number;
  /** Original invoice total (subtotal - discount + shipping + vat) */
  originalTotal: number;
  /** Total amount refunded across all refunds */
  totalRefunded: number;
  /** Whether any refunds exist */
  hasRefunds: boolean;
  /** Number of refunds on this order */
  refundCount: number;
  /** Net total after refunds (originalTotal - totalRefunded) */
  netTotal: number;
}

export interface ItemRefundInfo {
  /** How many units of this item have been refunded */
  refundedQty: number;
  /** Original ordered quantity */
  orderedQty: number;
  /** Whether some (but not all) units are refunded */
  isPartiallyRefunded: boolean;
  /** Whether all units are refunded */
  isFullyRefunded: boolean;
}

// ─── Computation ─────────────────────────────────────────────────

/**
 * Compute all financial values for an invoice from raw order data.
 * Pure function — no side effects, no API calls.
 */
export function computeInvoiceFinancials(
  order: Order,
  refunds?: Array<{ totalAmount: string | number }>,
): InvoiceFinancials {
  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discount ?? 0);
  const shippingFee = Number(order.shippingFee ?? 0);
  // Prisma returns `includeVAT` (capital); handle both for safety
  const hasVat = Boolean(
    (order as Record<string, unknown>).includeVAT ?? order.includeVAT,
  );
  const vatAmount = Number(order.vat ?? 0);
  const originalTotal = Number(order.total ?? 0);

  // Refund aggregation: prefer explicit refunds list, fallback to order.refunds
  const refundSource = refunds ?? order.refunds ?? [];
  const totalRefunded = refundSource.reduce(
    (sum, r) => sum + Number(r.totalAmount ?? 0),
    0,
  );
  const refundCount = refundSource.length;
  const hasRefunds = totalRefunded > 0;
  const netTotal = originalTotal - totalRefunded;

  return {
    subtotal,
    discount,
    hasVat,
    vatLabel: VAT_RATE_PERCENT_LABEL,
    vatAmount,
    shippingFee,
    originalTotal,
    totalRefunded,
    hasRefunds,
    refundCount,
    netTotal,
  };
}

/**
 * Compute refund info for a single order item.
 */
export function computeItemRefundInfo(item: {
  quantity: string | number;
  refundItems?: Array<{ quantity: string | number }>;
}): ItemRefundInfo {
  const orderedQty = Number(item.quantity);
  const refundedQty = (item.refundItems ?? []).reduce(
    (sum, ri) => sum + Number(ri.quantity),
    0,
  );

  return {
    refundedQty,
    orderedQty,
    isPartiallyRefunded: refundedQty > 0 && refundedQty < orderedQty,
    isFullyRefunded: refundedQty > 0 && refundedQty >= orderedQty,
  };
}

// ─── Currency Formatting ─────────────────────────────────────────

/**
 * Format a numeric amount with the given currency symbol/code.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  symbol?: string | null,
  decimalPlaces?: number,
): string {
  const dp = decimalPlaces ?? 2;
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: dp > 0 ? Math.min(dp, 2) : 0,
    maximumFractionDigits: dp > 0 ? Math.min(dp, 2) : 0,
  }).format(amount);

  if (symbol) return `${formatted} ${symbol}`;
  return `${formatted} ${currencyCode}`;
}

/**
 * Build a multi-currency representation of an amount.
 * Returns the primary (base) currency first, then any active secondary currencies.
 */
export function buildMultiCurrencyAmounts(
  amount: number,
  tenantCurrencies: TenantCurrency[],
  baseCurrencyCode: string,
): CurrencyAmount[] {
  const baseCurrency = tenantCurrencies.find((tc) => tc.isDefault);
  const results: CurrencyAmount[] = [
    {
      formatted: formatCurrency(
        amount,
        baseCurrencyCode,
        baseCurrency?.currency?.symbol,
        baseCurrency?.currency?.decimalPlaces,
      ),
      value: amount,
      code: baseCurrencyCode,
    },
  ];

  // Secondary currencies
  const secondaries = tenantCurrencies.filter(
    (tc) => tc.isActive && !tc.isDefault,
  );
  for (const sc of secondaries) {
    const converted = amount * Number(sc.exchangeRate);
    results.push({
      formatted: formatCurrency(
        converted,
        sc.currencyCode,
        sc.currency?.symbol,
        sc.currency?.decimalPlaces,
      ),
      value: converted,
      code: sc.currencyCode,
    });
  }

  return results;
}
