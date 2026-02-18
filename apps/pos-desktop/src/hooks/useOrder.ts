import { ordersApi } from "@/apis/ordersApi";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import {
  AddItemDto,
  CreateOrderDto,
  OrderFilters,
  ProcessPaymentBody,
} from "@/dto/order.dto";
import type { Order, OrderStatus } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    },
  });
};

export const useProcessPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payments,
      shiftId,
      deviceId,
      idempotencyKey,
    }: {
      id: string;
    } & ProcessPaymentBody) =>
      ordersApi.processPayment(id, {
        payments,
        shiftId,
        deviceId,
        idempotencyKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({
        queryKey: ["adjustmentHistory"],
      });
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
    },
  });
};

export const useAddItemToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; item: AddItemDto }>({
    mutationFn: ({ id, item }) => ordersApi.addItemToOrder(id, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
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
    },
  });
};

export const useRemoveItemFromOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, { id: string; itemId: string }>({
    mutationFn: ({ id, itemId }) => ordersApi.removeItemFromOrder(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
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
    },
  });
};

export const useSendToKitchen = () => {
  const queryClient = useQueryClient();

  return useMutation<Order, Error, string>({
    mutationFn: ordersApi.sendToKitchen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

export const usePreviewDeductions = (id: string, branchId: string) => {
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

type TableSelectorTransferVariables = {
  orderId: string;
  targetTableId: string;
  mergeIntoOrderId?: string;
  targetTableDisplayName?: string;
};

type TableSelectorTransferConflict = {
  code: "TABLE_HAS_ACTIVE_ORDER";
  message?: string;
  activeOrderIds: string[];
  orderId: string;
  targetTableId: string;
  targetTableDisplayName?: string;
};

export const useTableSelectorTransferOrder = () => {
  const queryClient = useQueryClient();
  const { loadOrder, closeTab } = useOrderStore();
  const closeModal = useModalStore((state) => state.closeModal);
  const [conflict, setConflict] =
    useState<TableSelectorTransferConflict | null>(null);

  const mutation = useMutation<Order, any, TableSelectorTransferVariables>({
    mutationFn: ({ orderId, targetTableId, mergeIntoOrderId }) =>
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
    onError: (err, variables) => {
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
    { targetOrderId: string; sourceOrderId: string }
  >({
    mutationFn: ({ targetOrderId, sourceOrderId }) =>
      ordersApi.mergeOrders(targetOrderId, sourceOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TABLE_QUERY_KEY });
    },
  });
};

/**
 * Query hook for fetching active order by tableId
 * Useful when you want automatic refetching
 */
export const useActiveOrderByTable = (tableId: string | null) => {
  return useQuery({
    queryKey: [...ORDER_QUERY_KEY, "active-by-table", tableId],
    queryFn: () => ordersApi.getActiveOrderByTableId(tableId!),
    enabled: !!tableId,
  });
};

/**
 * Mutation hook for on-demand fetching of active order by tableId
 * Useful when you want to trigger the fetch imperatively (e.g., on table selection)
 */
export const useFetchActiveOrderByTable = () => {
  return useMutation<Order | null, Error, string>({
    mutationFn: ordersApi.getActiveOrderByTableId,
  });
};
