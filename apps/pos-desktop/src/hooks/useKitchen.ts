import { kitchenApi } from "@/apis/kitchen";
import { OrderStatus } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetKitchenOrders = (branchId?: string) =>
  useQuery({
    queryKey: ["kitchen-orders", branchId],
    queryFn: () => kitchenApi.getOrders(branchId || undefined),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

export const useUpdateKitchenStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => kitchenApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
  });
};
