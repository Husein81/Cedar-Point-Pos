import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
      retry: (failureCount, _error) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "pos-query-cache",
  // Throttle writes to avoid thrashing localStorage
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0];
      return (
        key === "products" ||
        key === "categories" ||
        key === "tables" ||
        key === "floors" ||
        key === "modifiers"
      );
    },
  },
});
