import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "@repo/ui";
import { refundsApi } from "@/apis/refundsApi";
import { useBaseCurrency } from "@/hooks/useCurrency";
import type {
  CreateRefundDto,
  RefundFilters,
  RefundableOrdersFilters,
} from "@/dto/refund.dto";

const REFUND_QUERY_KEY = ["refunds"];

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(", ");
    if (data?.message) return data.message;
  }
  return fallback;
};

export const useRefundableInfo = (orderId: string) => {
  return useQuery({
    queryKey: [...REFUND_QUERY_KEY, "refundable", orderId],
    queryFn: () => refundsApi.getRefundableInfo(orderId),
    enabled: !!orderId,
  });
};

export const useOrderRefunds = (orderId: string) => {
  return useQuery({
    queryKey: [...REFUND_QUERY_KEY, "order", orderId],
    queryFn: () => refundsApi.getOrderRefunds(orderId),
    enabled: !!orderId,
  });
};

export const useRefunds = (filters?: RefundFilters) => {
  return useQuery({
    queryKey: [...REFUND_QUERY_KEY, filters],
    queryFn: () => refundsApi.getRefunds(filters),
  });
};

export const useRefundableOrders = (filters?: RefundableOrdersFilters) => {
  return useQuery({
    queryKey: [...REFUND_QUERY_KEY, "orders", filters],
    queryFn: () => refundsApi.getRefundableOrders(filters),
  });
};

export const useOrderRefundHistory = (orderId: string) => {
  return useQuery({
    queryKey: [...REFUND_QUERY_KEY, "history", orderId],
    queryFn: () => refundsApi.getOrderRefundHistory(orderId),
    enabled: !!orderId,
  });
};

export const useCreateRefund = () => {
  const queryClient = useQueryClient();
  const { format: formatMoney } = useBaseCurrency();

  return useMutation({
    mutationFn: (data: CreateRefundDto) => refundsApi.createRefund(data),
    onSuccess: (refund) => {
      toast.success(
        `Refund of ${formatMoney(refund.totalAmount)} processed`,
      );
      // Root key covers refundable info, order lists, and history sub-keys.
      queryClient.invalidateQueries({ queryKey: REFUND_QUERY_KEY });
      // Refunds restore stock and restore/reverse loyalty points.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["adjustmentHistory"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Refund failed. Please try again."));
    },
  });
};
