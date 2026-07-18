import { useQuery } from "@tanstack/react-query";
import { tablesService } from "@/services/tables";

const TABLES_POLL_MS = 15000;

export function useTablesOverview(branchId?: string | null) {
  return useQuery({
    queryKey: ["tables", branchId],
    queryFn: () => tablesService.getOverview(String(branchId)),
    enabled: Boolean(branchId),
    refetchInterval: TABLES_POLL_MS,
  });
}
