import type { PaymentMethod } from "@repo/types";
import { api } from "./api";

/**
 * Receipt data types matching backend DTO
 */

export interface ReceiptTenant {
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  businessType: "RETAIL" | "RESTAURANT";
}

export interface ReceiptBranch {
  name: string;
  address: string | null;
  phone: string | null;
}

export interface ReceiptOrder {
  id: string;
  orderNumber: string;
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "RETAIL";
  status: string;
  createdAt: string;
  completedAt: string | null;
  tableNumber: number | null;
  tableName: string | null;
}

export interface ReceiptCashier {
  id: string;
  name: string;
}

export interface ReceiptCustomer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export interface ReceiptModifier {
  name: string;
  price: number;
}

export interface ReceiptItem {
  id: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  modifiers: ReceiptModifier[];
}

export interface ReceiptPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number | null;
  amountInBaseCurrency: number;
  paidAt: string;
}

export interface ReceiptTotals {
  subtotal: number;
  discount: number;
  discountPercentage: number | null;
  shippingFee: number;
  tax: number;
  total: number;
  totalPaid: number;
  change: number;
  balance: number;
}

export interface ReceiptCurrency {
  baseCurrencyCode: string;
  baseCurrencySymbol: string;
  decimalPlaces: number;
}

export interface ReceiptFooter {
  thankYouMessage: string;
  footerText: string | null;
}

export interface ReceiptData {
  receiptId: string;
  isReprint: boolean;
  printedAt: string;
  printCount: number;
  tenant: ReceiptTenant;
  branch: ReceiptBranch;
  order: ReceiptOrder;
  cashier: ReceiptCashier | null;
  customer: ReceiptCustomer | null;
  items: ReceiptItem[];
  totals: ReceiptTotals;
  payments: ReceiptPayment[];
  currency: ReceiptCurrency;
  footer: ReceiptFooter;
}

export interface CanPrintResponse {
  canPrint: boolean;
}

/**
 * Receipts API
 */
export const receiptsApi = {
  /**
   * Get receipt data for an order
   */
  getReceiptData: async (
    orderId: string,
    isReprint = false
  ): Promise<ReceiptData> => {
    const response = await api.get<ReceiptData>(`/receipts/${orderId}`, {
      params: { isReprint: isReprint ? "true" : undefined },
    });
    return response.data;
  },

  /**
   * Check if a receipt can be printed for an order
   */
  canPrintReceipt: async (orderId: string): Promise<boolean> => {
    const response = await api.get<CanPrintResponse>(
      `/receipts/${orderId}/can-print`
    );
    return response.data.canPrint;
  },
};
