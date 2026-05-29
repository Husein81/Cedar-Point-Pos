import {
  CreateRefundDto,
  RefundableInfo,
  RefundableOrdersFilters,
  RefundableOrderSummary,
  RefundFilters,
  RefundHistory,
} from "@/dto/refund.dto";
import type { PaginationResponse, Refund } from "@repo/types";
import { api } from "./api";

export const refundsApi = {
  // Get refundable info for an order
  getRefundableInfo: async (orderId: string): Promise<RefundableInfo> => {
    const response = await api.get(`/refunds/order/${orderId}/refundable`);
    return response.data;
  },

  // Get orders eligible for refund (PAID, COMPLETED, PARTIALLY_REFUNDED)
  getRefundableOrders: async (
    filters?: RefundableOrdersFilters,
  ): Promise<PaginationResponse<RefundableOrderSummary>> => {
    const response = await api.get("/refunds/orders", { params: filters });
    console.log(response.data);
    return response.data;
  },

  // Get refund history for a specific order
  getOrderRefundHistory: async (orderId: string): Promise<RefundHistory[]> => {
    const response = await api.get(`/refunds/order/${orderId}/history`);
    return response.data;
  },

  // Create a new refund
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
