import { categoriesApi } from "@/apis/cateogriesApi";
import { QueryParams } from "@repo/types";
import { useQuery } from "@tanstack/react-query";

export const useCategories = (params: QueryParams) =>
  useQuery({
    queryKey: ["categories", params],
    queryFn: () => categoriesApi.getAll({ params }),
  });
