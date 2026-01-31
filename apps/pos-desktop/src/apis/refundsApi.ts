import {
  CreateRefundDto,
  LookupRefundableResult,
  RefundableInfo,
  RefundableOrdersFilters,
  RefundableOrderSummary,
  RefundFilters,
  RefundHistory,
  ValidateRefundDto,
  ValidateRefundResponse,
} from "@/dto/refund.dto";
import type { PaginationResponse, Refund } from "@repo/types";
import { api } from "./api";

export const refundsApi = {
  // =====================
  // SCANNER-FIRST FLOW (NEW)
  // =====================

  /**
   * Lookup refundable items by barcode or SKU
   * Returns product info + recent order items that can be refunded
   */
  lookupByBarcode: async (barcode: string): Promise<LookupRefundableResult> => {
    const response = await api.get("/refunds/lookup", {
      params: { barcode },
    });
    return response.data;
  },

  /**
   * Validate a refund request before submitting
   * Returns warnings, whether manager override is needed, and estimated total
   */
  validateRefund: async (
    data: ValidateRefundDto
  ): Promise<ValidateRefundResponse> => {
    const response = await api.post("/refunds/validate", data);
    return response.data;
  },

  // =====================
  // EXISTING FLOW
  // =====================

  // Get refundable info for an order
  getRefundableInfo: async (orderId: string): Promise<RefundableInfo> => {
    const response = await api.get(`/refunds/order/${orderId}/refundable`);
    return response.data;
  },

  // Get orders eligible for refund (PAID, COMPLETED, PARTIALLY_REFUNDED)
  getRefundableOrders: async (
    filters?: RefundableOrdersFilters
  ): Promise<PaginationResponse<RefundableOrderSummary>> => {
    const response = await api.get("/refunds/orders", { params: filters });
    return response.data;
  },

  // Get refund history for a specific order
  getOrderRefundHistory: async (orderId: string): Promise<RefundHistory[]> => {
    const response = await api.get(`/refunds/order/${orderId}/history`);
    return response.data;
  },

  // Create a new refund (supports both order-linked and manual)
  createRefund: async (data: CreateRefundDto): Promise<Refund> => {
    const response = await api.post("/refunds", data);
    return response.data;
  },

  // Get all refunds with filters
  getRefunds: async (filters?: RefundFilters): Promise<Refund[]> => {
    const response = await api.get<Refund[]>("/refunds", { params: filters });
    return response.data;
  },

  // Get refunds for a specific order
  getOrderRefunds: async (orderId: string): Promise<Refund[]> => {
    const response = await api.get<Refund[]>("/refunds", {
      params: { orderId },
    });
    return response.data;
  },
};
