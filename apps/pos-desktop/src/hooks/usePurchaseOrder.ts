import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchaseOrderApi } from "@/apis/purchaseOrderApi";
import type {
  AddPurchaseOrderItemDto,
  CreatePurchaseOrderDto,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderSummary,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderItemDto,
} from "@/dto/purchaseOrder.dto";
import type { PaginationResponse, QueryParams } from "@repo/types";

const PO_QUERY_KEY = ["purchase-orders"];

/**
 * Hook for fetching paginated purchase orders
 */
export const usePurchaseOrders = (
  params?: QueryParams & {
    status?: string;
    supplierId?: string;
    branchId?: string;
  }
) => {
  return useQuery<PaginationResponse<PurchaseOrderSummary>>({
    queryKey: [...PO_QUERY_KEY, "list", params],
    queryFn: () => purchaseOrderApi.getPurchaseOrders(params),
    staleTime: 60 * 1000,
  });
};

/**
 * Hook for fetching a single purchase order
 */
export const usePurchaseOrder = (id: string | null) => {
  return useQuery<PurchaseOrderDetail>({
    queryKey: [...PO_QUERY_KEY, id],
    queryFn: () => purchaseOrderApi.getPurchaseOrder(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
};

/**
 * Hook for creating a purchase order
 */
export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetail, Error, CreatePurchaseOrderDto>({
    mutationFn: purchaseOrderApi.createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

/**
 * Hook for updating PO metadata
 */
export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderDetail,
    Error,
    { id: string; data: UpdatePurchaseOrderDto }
  >({
    mutationFn: ({ id, data }) =>
      purchaseOrderApi.updatePurchaseOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PO_QUERY_KEY, id] });
    },
  });
};

/**
 * Hook for deleting a PENDING purchase order
 */
export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: purchaseOrderApi.deletePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
};

/**
 * Hook for transitioning PO: PENDING → ORDERED
 */
export const useOrderPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetail, Error, string>({
    mutationFn: purchaseOrderApi.orderPurchaseOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PO_QUERY_KEY, id] });
    },
  });
};

/**
 * Hook for receiving a purchase order (updates inventory)
 */
export const useReceivePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetail, Error, string>({
    mutationFn: purchaseOrderApi.receivePurchaseOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PO_QUERY_KEY, id] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

/**
 * Hook for cancelling a purchase order
 */
export const useCancelPurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseOrderDetail, Error, string>({
    mutationFn: purchaseOrderApi.cancelPurchaseOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...PO_QUERY_KEY, id] });
    },
  });
};

// ─── Item Management ───

/**
 * Hook for adding an item to a PO
 */
export const useAddPurchaseOrderItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderItem,
    Error,
    { purchaseOrderId: string; data: AddPurchaseOrderItemDto }
  >({
    mutationFn: ({ purchaseOrderId, data }) =>
      purchaseOrderApi.addItem(purchaseOrderId, data),
    onSuccess: (_, { purchaseOrderId }) => {
      queryClient.invalidateQueries({
        queryKey: [...PO_QUERY_KEY, purchaseOrderId],
      });
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
    },
  });
};

/**
 * Hook for updating a PO item
 */
export const useUpdatePurchaseOrderItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseOrderItem,
    Error,
    {
      purchaseOrderId: string;
      itemId: string;
      data: UpdatePurchaseOrderItemDto;
    }
  >({
    mutationFn: ({ purchaseOrderId, itemId, data }) =>
      purchaseOrderApi.updateItem(purchaseOrderId, itemId, data),
    onSuccess: (_, { purchaseOrderId }) => {
      queryClient.invalidateQueries({
        queryKey: [...PO_QUERY_KEY, purchaseOrderId],
      });
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
    },
  });
};

/**
 * Hook for removing a PO item
 */
export const useRemovePurchaseOrderItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { purchaseOrderId: string; itemId: string }
  >({
    mutationFn: ({ purchaseOrderId, itemId }) =>
      purchaseOrderApi.removeItem(purchaseOrderId, itemId),
    onSuccess: (_, { purchaseOrderId }) => {
      queryClient.invalidateQueries({
        queryKey: [...PO_QUERY_KEY, purchaseOrderId],
      });
      queryClient.invalidateQueries({ queryKey: PO_QUERY_KEY });
    },
  });
};
