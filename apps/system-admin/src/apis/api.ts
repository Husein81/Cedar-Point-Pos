import { QueryClient } from "@tanstack/react-query";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message || "Request failed");
  }

  return res.json();
}

// Create and export QueryClient with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_00 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnMount: true, // Refetch if data is stale when component mounts
      refetchOnReconnect: false, // Don't refetch on reconnect
      retry: 1, // Retry failed requests once
    },
    mutations: {
      retry: 1,
    },
  },
});
