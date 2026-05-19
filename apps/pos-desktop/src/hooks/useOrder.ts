import { ordersApi } from "@/apis/ordersApi";
import {
  AddItemDto,
  CreateOrderDto,
  OrderFilters,
  PaymentDto,
  type LoyaltyRedemptionPayload,
} from "@/dto/order.dto";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import type { Order, OrderStatus } from "@repo/types";
import {
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const ORDER_QUERY_KEY = ["orders"];
const TABLE_QUERY_KEY = ["tables"];

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, filters],
    queryFn: () => ordersApi.getOrders(filters),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, CreateOrderDto>({
    mutationFn: ordersApi.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({
        queryKey: ["adjustmentHistory"],
      });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useProcessPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payments,
      loyalty,
    }: {
      id: string;
      payments: PaymentDto[];
      loyalty?: LoyaltyRedemptionPayload;
    }) => ordersApi.processPayment(id, { payments, loyalty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({
        queryKey: ["adjustmentHistory"],
      });
      // Invalidate loyalty account after redemption
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; status: OrderStatus }>({
    mutationFn: ({ id, status }) => ordersApi.updateOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useUpdateOrderDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; discount: number }>({
    mutationFn: ({ id, discount }) =>
      ordersApi.updateOrderDiscount(id, { discount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useAssignTableToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; tableId: string }>({
    mutationFn: ({ id, tableId }) =>
      ordersApi.assignTableToOrder(id, { tableId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useAddItemToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; item: AddItemDto }>({
    mutationFn: ({ id, item }) => ordersApi.addItemToOrder(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useBatchAddItemsToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; items: AddItemDto[] }>({
    mutationFn: ({ id, items }) => ordersApi.batchAddItemsToOrder(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useUpdateItemQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    Error,
    { id: string; itemId: string; quantity: number }
  >({
    mutationFn: ({ id, itemId, quantity }) =>
      ordersApi.updateItemQuantity(id, itemId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useRemoveItemFromOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; itemId: string }>({
    mutationFn: ({ id, itemId }) => ordersApi.removeItemFromOrder(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useUpdateItemDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    Error,
    { id: string; itemId: string; value: number; type: "PERCENTAGE" | "FIXED" }
  >({
    mutationFn: ({ id, itemId, value, type }) =>
      ordersApi.updateItemDiscount(id, itemId, { value, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useSendToKitchen = (): UseMutationResult<Order, Error, string> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ordersApi.sendToKitchen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const usePreviewDeductions = (
  id: string,
  branchId: string,
): UseQueryResult => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, id, "preview-deductions", branchId],
    queryFn: () => ordersApi.previewDeductions(id, branchId),
    enabled: !!id && !!branchId,
  });
};

export const useTransferOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    Error,
    { orderId: string; targetTableId: string; mergeIntoOrderId?: string }
  >({
    mutationFn: ({ orderId, targetTableId, mergeIntoOrderId }) =>
      ordersApi.transferOrderToTable(orderId, targetTableId, mergeIntoOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

type TableSelectorTransferConflict = {
  code: "TABLE_HAS_ACTIVE_ORDER";
  message?: string;
  activeOrderIds: string[];
  orderId: string;
  targetTableId: string;
  targetTableDisplayName?: string;
};

type TransferOrderVariables = {
  orderId: string;
  targetTableId: string;
  mergeIntoOrderId?: string;
  targetTableDisplayName?: string;
};

export const useTableSelectorTransferOrder = (): UseMutationResult<
  Order,
  Error,
  TransferOrderVariables,
  unknown
> & {
  conflict: TableSelectorTransferConflict | null;
  clearConflict: () => void;
} => {
  const queryClient = useQueryClient();
  const { loadOrder, closeTab } = useOrderStore();
  const closeModal = useModalStore((state) => state.closeModal);
  const [conflict, setConflict] =
    useState<TableSelectorTransferConflict | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      orderId,
      targetTableId,
      mergeIntoOrderId,
    }: TransferOrderVariables) =>
      ordersApi.transferOrderToTable(orderId, targetTableId, mergeIntoOrderId),
    onMutate: () => {
      setConflict(null);
    },
    onSuccess: (transferredOrder, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });

      const targetDisplayName =
        variables.targetTableDisplayName ?? "selected table";
      const isMerge = !!variables.mergeIntoOrderId;

      if (isMerge) {
        const activeTabId = useOrderStore.getState().activeTabId;
        if (transferredOrder.id !== variables.orderId && activeTabId) {
          closeTab(activeTabId);
        }

        loadOrder(transferredOrder as any, true);
        toast.success(`Order transferred and merged on ${targetDisplayName}`);
        closeModal();
        return;
      }

      loadOrder(transferredOrder as any, true);
      toast.success(`Order transferred to ${targetDisplayName}`);
      closeModal();
    },
    onError: (err: any, variables) => {
      const data = err?.response?.data;
      if (data?.code === "TABLE_HAS_ACTIVE_ORDER") {
        setConflict({
          code: "TABLE_HAS_ACTIVE_ORDER",
          message: data?.message,
          activeOrderIds: data?.activeOrderIds || [],
          orderId: variables.orderId,
          targetTableId: variables.targetTableId,
          targetTableDisplayName: variables.targetTableDisplayName,
        });
        return;
      }

      toast.error(
        data?.message ||
          (variables.mergeIntoOrderId
            ? "Failed to transfer and merge"
            : "Failed to transfer order"),
      );
    },
  });

  return {
    ...mutation,
    conflict,
    clearConflict: () => setConflict(null),
  };
};

export const useMergeOrders = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    Error,
    { targetOrderId: string; sourceOrderId: string },
    unknown
  >({
    mutationFn: ({ targetOrderId, sourceOrderId }) =>
      ordersApi.mergeOrders(targetOrderId, sourceOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};

export const useActiveOrderByTable = (tableId: string | null) => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, "active-by-table", tableId],
    queryFn: () => ordersApi.getActiveOrderByTableId(tableId!),
    enabled: !!tableId,
  });
};

export const useFetchActiveOrderByTable = () => {
  return useMutation<Order | null, Error, string, unknown>({
    mutationFn: ordersApi.getActiveOrderByTableId,
  });
};
export const useNextOrderNumber = (branchId: string) => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, "next-number", branchId],
    queryFn: () => ordersApi.getNextOrderNumber(branchId),
    enabled: !!branchId,
  });
};
