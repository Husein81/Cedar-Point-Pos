import { useQuery } from "@tanstack/react-query";
import { branchesService } from "@/services/branches";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesService.getAll(),
    staleTime: 10 * 60 * 1000,
  });
}
