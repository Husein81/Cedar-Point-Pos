import type { OrderStatus } from "@repo/types";
import {
  useMutation,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ordersService,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type OrderFilters,
} from "@/services/orders";

const ORDER_QUERY_KEYS = [["orders"], ["tables"], ["kitchen-orders"]] as const;

/** Poll interval keeping order/kitchen status fresh without sockets. */
const ORDERS_POLL_MS = 15000;
const ORDERS_PAGE_SIZE = 30;

function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ORDER_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters ?? {}],
    queryFn: () => ordersService.getAll(filters),
    refetchInterval: ORDERS_POLL_MS,
  });
}

export function useOrdersInfinite(filters?: OrderFilters) {
  return useInfiniteQuery({
    queryKey: ["orders-infinite", filters ?? {}],
    queryFn: ({ pageParam = 1 }) =>
      ordersService.getAll({
        ...filters,
        page: pageParam,
        limit: ORDERS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.meta) return undefined;
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    refetchInterval: ORDERS_POLL_MS,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => ordersService.getById(String(id)),
    enabled: Boolean(id),
    refetchInterval: ORDERS_POLL_MS,
  });
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (data: CreateOrderInput) => ordersService.create(data),
    onSuccess: invalidate,
  });
}

export function useSendToKitchen() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (id: string) => ordersService.sendToKitchen(id),
    onSuccess: invalidate,
  });
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useBatchAddItems() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: CreateOrderItemInput[];
    }) => ordersService.batchAddItems(id, items),
    onSuccess: invalidate,
  });
}

export function useUpdateItemQuantity() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({
      id,
      itemId,
      quantity,
    }: {
      id: string;
      itemId: string;
      quantity: number;
    }) => ordersService.updateItemQuantity(id, itemId, quantity),
    onSuccess: invalidate,
  });
}

export function useRemoveOrderItem() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      ordersService.removeItem(id, itemId),
    onSuccess: invalidate,
  });
}
