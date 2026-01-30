import { kitchenApi } from "@/apis/kitchen";
import { queryClient } from "@/components/providers";
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
  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => kitchenApi.updateOrderStatus(orderId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["kitchen-orders", data.branchId],
      });
    },
  });
};
