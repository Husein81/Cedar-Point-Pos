import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/apis/usersApi";

const USERS_QUERY_KEY = ["tenant-users"];

export const usersKeys = {
  all: USERS_QUERY_KEY,
  list: () => [...USERS_QUERY_KEY, "list"] as const,
};

export const useTenantUsers = () => {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: () => usersApi.getUsers(),
  });
};
