import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { refundsApi } from "@/apis/refundsApi";
import type {
  CreateRefundDto,
  RefundFilters,
  RefundableOrdersFilters,
} from "@/dto/refund.dto";

const REFUND_QUERY_KEY = ["refunds"];

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

  return useMutation({
    mutationFn: (data: CreateRefundDto) => refundsApi.createRefund(data),
    // ✅ OPTIMIZED: Optimistic update for instant UI feedback
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: [...REFUND_QUERY_KEY, "refundable", variables.orderId],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData([
        ...REFUND_QUERY_KEY,
        "refundable",
        variables.orderId,
      ]);

      // Optimistically update refundable info
      queryClient.setQueryData(
        [...REFUND_QUERY_KEY, "refundable", variables.orderId],
        (old: any) => {
          if (!old) return old;

          const updatedItems = old.items.map((item: any) => {
            const refundItem = variables.items.find(
              (i) => i.orderItemId === item.orderItemId
            );
            if (!refundItem) return item;

            return {
              ...item,
              refundedQuantity: item.refundedQuantity + refundItem.quantity,
              refundableQuantity: item.refundableQuantity - refundItem.quantity,
            };
          });

          const totalRefundable = updatedItems.reduce(
            (sum: number, item: any) =>
              sum + item.refundableQuantity * item.unitPrice,
            0
          );

          const isFullyRefunded = updatedItems.every(
            (item: any) => item.refundableQuantity <= 0
          );

          return {
            ...old,
            items: updatedItems,
            totalRefundable,
            isFullyRefunded,
          };
        }
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [...REFUND_QUERY_KEY, "refundable", variables.orderId],
          context.previousData
        );
      }
    },
    onSuccess: (_, variables) => {
      // ✅ OPTIMIZED: Targeted invalidations instead of blanket refetch
      queryClient.invalidateQueries({
        queryKey: [...REFUND_QUERY_KEY, "refundable", variables.orderId],
      });
      queryClient.invalidateQueries({
        queryKey: [...REFUND_QUERY_KEY, "history", variables.orderId],
      });
      queryClient.invalidateQueries({
        queryKey: [...REFUND_QUERY_KEY, "orders"],
      });
      // Invalidate inventory (refund restores stock)
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
  });
};
