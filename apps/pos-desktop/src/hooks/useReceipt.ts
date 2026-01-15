import { useQuery } from "@tanstack/react-query";
import { receiptsApi, type ReceiptData } from "@/apis/receiptsApi";

const RECEIPT_QUERY_KEY = ["receipts"];

/**
 * Fetch receipt data for an order
 */
export const useReceiptData = (orderId: string, isReprint = false) => {
  return useQuery<ReceiptData>({
    queryKey: [...RECEIPT_QUERY_KEY, orderId, { isReprint }],
    queryFn: () => receiptsApi.getReceiptData(orderId, isReprint),
    enabled: !!orderId,
    // Receipts are point-in-time snapshots, can be cached
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Check if a receipt can be printed for an order
 */
export const useCanPrintReceipt = (orderId: string) => {
  return useQuery<boolean>({
    queryKey: [...RECEIPT_QUERY_KEY, orderId, "can-print"],
    queryFn: () => receiptsApi.canPrintReceipt(orderId),
    enabled: !!orderId,
  });
};
