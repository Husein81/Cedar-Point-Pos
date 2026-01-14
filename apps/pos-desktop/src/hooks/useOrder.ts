import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Order, OrderStatus, PaymentMethod } from "@repo/types";
import {
  ordersApi,
  type CreateOrderDto,
  type OrderFilters,
  type AddItemDto,
} from "@/apis/ordersApi";

const ORDER_QUERY_KEY = ["orders"];

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
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({
        queryKey: ["adjustmentHistory"],
      });
    },
  });
};

export const useProcessPayment = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Order,
    Error,
    {
      id: string;
      amount: number;
      method: PaymentMethod;
      currencyCode?: string;
      exchangeRate?: number;
    }
  >({
    mutationFn: ({ id, ...payment }) => ordersApi.processPayment(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEY });
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
