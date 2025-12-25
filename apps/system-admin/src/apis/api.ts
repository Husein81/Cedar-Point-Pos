import { QueryClient } from "@tanstack/react-query";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  // Handle auth errors
  if (res.status === 401 || res.status === 403) {
    throw new ApiError("Unauthorized", res.status);
  }

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new ApiError(error?.message || "Request failed", res.status);
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
