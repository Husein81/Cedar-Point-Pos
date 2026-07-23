import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { extractErrorMessage } from "@/utils/error";
import type {
  CheckoutInput,
  HoldOrderInput,
  ListOrdersInput,
  RefundInput,
} from "@/shared/schemas";

const ORDER_QUERY_KEY = ["orders"];
const HELD_QUERY_KEY = ["orders", "held"];
const PRODUCT_QUERY_KEY = ["products"];
const STOCK_QUERY_KEY = ["stock"];
const SHIFT_QUERY_KEY = ["shifts"];

// Canonical invalidation set after any sale-affecting mutation.
const invalidateSaleQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: STOCK_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: SHIFT_QUERY_KEY });
};

export const useOrders = (params: ListOrdersInput) =>
  useQuery({
    queryKey: [...ORDER_QUERY_KEY, "list", params],
    queryFn: () => invoke("orders:list", params),
    placeholderData: (previous) => previous,
  });

export const useOrderDetails = (id: string) =>
  useQuery({
    queryKey: [...ORDER_QUERY_KEY, id],
    queryFn: () => invoke("orders:get", { id }),
    enabled: !!id,
  });

export const useHeldOrders = () =>
  useQuery({
    queryKey: HELD_QUERY_KEY,
    queryFn: () => invoke("orders:listHeld", undefined),
  });

export const useCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CheckoutInput) => invoke("orders:checkout", input),
    onSuccess: (order) => {
      toast.success(`Sale ${order.orderNumber} completed`);
      invalidateSaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Checkout failed"));
    },
  });
};

export const useHoldOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HoldOrderInput) => invoke("orders:hold", input),
    onSuccess: () => {
      toast.success("Order held");
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Failed to hold order"));
    },
  });
};

export const useRefundOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RefundInput) => invoke("orders:refund", input),
    onSuccess: (order) => {
      toast.success(`Refund for ${order.orderNumber} recorded`);
      invalidateSaleQueries(queryClient);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Refund failed"));
    },
  });
};
