/**
 * Shared utility functions for all reports
 */

import type { DateRangePreset } from "@/types/reports";

/**
 * Get date range from preset
 */
export const getDateRangeFromPreset = (
  preset: DateRangePreset,
): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setMilliseconds(-1);

  switch (preset) {
    case "today":
      return { from: today, to: tomorrow };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: today };
    }
    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: tomorrow };
    }
    case "this_month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: startOfMonth, to: tomorrow };
    }
    case "custom":
    default:
      return { from: today, to: tomorrow };
  }
};

/**
 * Format value as currency
 */
export const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(value);

/**
 * Format date string to readable format with time
 */
export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Format date string to readable format without time
 */
export const formatDateOnly = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/**
 * Get badge variant for order/payment status
 */
export const getStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "COMPLETED":
    case "PAID":
      return "default";
    case "PENDING":
    case "IN_PROGRESS":
    case "CONFIRMED":
      return "secondary";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
};

/**
 * Get badge variant for order type
 */
export const getTypeVariant = (
  type: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "DINE_IN":
      return "secondary";
    case "TAKEAWAY":
      return "default";
    case "DELIVERY":
      return "default";
    case "RETAIL":
      return "outline";
    default:
      return "outline";
  }
};

/**
 * Get label for order type
 */
export const getTypeLabel = (type: string) => {
  switch (type) {
    case "DINE_IN":
      return "Dine In";
    case "TAKEAWAY":
      return "Takeaway";
    case "DELIVERY":
      return "Delivery";
    case "RETAIL":
      return "Retail";
    default:
      return type;
  }
};

/**
 * Get badge variant for payment method
 */
export const getMethodVariant = (
  method: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (method) {
    case "CASH":
      return "default";
    case "CARD":
      return "secondary";
    case "CREDIT":
      return "outline";
    case "VOUCHER":
      return "secondary";
    case "ONLINE":
      return "default";
    default:
      return "outline";
  }
};

/**
 * Get label for payment method
 */
export const getMethodLabel = (method: string) => {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "CREDIT":
      return "Credit";
    case "VOUCHER":
      return "Voucher";
    case "ONLINE":
      return "Online";
    default:
      return method;
  }
};

/**
 * Get badge variant for inventory change type
 */
export const getChangeTypeVariant = (
  type: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "SALE":
    case "ORDER_DEDUCTION":
    case "TRANSFER_OUT":
      return "destructive";
    case "REFUND":
    case "TRANSFER_IN":
      return "default";
    case "SET_STOCK":
    case "ADJUST_STOCK":
      return "secondary";
    default:
      return "outline";
  }
};

/**
 * Format inventory change type label
 */
export const formatChangeType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

/**
 * Common state initialization for report pages
 */
export const getInitialReportState = (preset: DateRangePreset = "today") => ({
  datePreset: preset,
  filters: getDateRangeFromPreset(preset),
  page: 1,
  pageSize: 25,
  searchTerm: "",
  appliedFilters: getDateRangeFromPreset(preset),
  hasFetched: false,
  isExporting: false,
});
