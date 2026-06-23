import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CreateTransferDto,
  TransferQuery,
  UpdateTransferDto,
  transfersApi,
} from "@/apis/transfersApi";

export const TRANSFER_QUERY_KEY = ["transfers"];

export const useTransfers = (query: TransferQuery) => {
  return useQuery({
    queryKey: [...TRANSFER_QUERY_KEY, query],
    queryFn: () => transfersApi.getTransfers(query),
    staleTime: 2 * 60 * 1000,
  });
};

export const useTransfer = (id: string) => {
  return useQuery({
    queryKey: [...TRANSFER_QUERY_KEY, id],
    queryFn: () => transfersApi.getTransfer(id),
    enabled: !!id,
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferDto) => transfersApi.createTransfer(data),
    onSuccess: () => {
      toast.success("Transfer request created successfully");
      queryClient.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY });
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message || "Failed to create transfer";
      toast.error(msg);
    },
  });
};

export const useCompleteTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transfersApi.completeTransfer(id),
    onSuccess: () => {
      toast.success("Transfer completed — inventory updated");
      queryClient.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY });
      // Invalidate stock so the stock page reflects the changes
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["adjustmentHistory"] });
    },
    onError: (error: any) => {
      const detail = error?.response?.data;
      if (detail?.insufficientStock) {
        const lines = (detail.insufficientStock as any[])
          .map(
            (s: any) =>
              `${s.productName}: requested ${s.requested}, available ${s.available}`
          )
          .join("\n");
        toast.error(`Insufficient stock:\n${lines}`);
      } else {
        toast.error(detail?.message || "Failed to complete transfer");
      }
    },
  });
};

export const useCancelTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transfersApi.cancelTransfer(id),
    onSuccess: () => {
      toast.success("Transfer cancelled");
      queryClient.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to cancel transfer");
    },
  });
};

export const useUpdateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransferDto }) =>
      transfersApi.updateTransfer(id, data),
    onSuccess: () => {
      toast.success("Transfer updated");
      queryClient.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update transfer");
    },
  });
};
