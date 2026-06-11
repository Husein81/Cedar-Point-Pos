import { kitchenApi } from "@/apis/kitchen";
import { useOfflineQueueStore } from "@/store/offlineQueueStore";
import { useNetworkStatus } from "@/context/NetworkContext";
import { queryClient } from "@/lib/queryClient";
import { OrderStatus } from "@repo/types";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useGetKitchenOrders = ({
  branchId,
  page,
  limit,
}: {
  branchId?: string;
  page?: string;
  limit?: string;
}) =>
  useQuery({
    queryKey: ["kitchen-orders", branchId, page, limit],
    queryFn: () => kitchenApi.getOrders({ branchId, page, limit }),
    refetchInterval: 10000,
  });

export const useUpdateKitchenStatus = () => {
  const { enqueue } = useOfflineQueueStore();
  const { isOnline } = useNetworkStatus();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      if (!isOnline && orderId.startsWith("offline-")) {
        return { orderId, status };
      } else if (!isOnline) {
        enqueue({
          type: "UPDATE_ORDER_STATUS",
          localId: `offline-kitchen-status-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          label: `Update Kitchen Status to ${status}`,
          payload: { orderId, status },
        });
        return { orderId, status, branchId: "" };
      }
      return kitchenApi.updateOrderStatus(orderId, status);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["kitchen-orders", data.branchId],
      });
    },
  });
};
