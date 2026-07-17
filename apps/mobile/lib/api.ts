import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "@/store/auth";
import type { RefreshResponse } from "@/types";

const DEFAULT_API_PORT = "5000";
const REQUEST_TIMEOUT_MS = 15000;

const isLocalHost = (hostname: string) => {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.startsWith("192.168.") || hostname.startsWith("10."))
    return true;

  const match = hostname.match(/^172\.(\d{1,2})\./);
  if (!match) return false;

  const segment = Number(match[1]);
  return segment >= 16 && segment <= 31;
};

const tryParseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const normalizeApiUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  if (!url) return null;

  url = url.replace(/^exps:\/\//i, "https://").replace(/^exp:\/\//i, "http://");

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  return url;
};

const getHostFromUri = (uri?: string | null) => {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  const parsed = tryParseUrl(
    /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`,
  );

  return parsed?.hostname ?? null;
};

const resolveApiUrl = () => {
  const envUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);

  const devHost = getHostFromUri(Constants.expoConfig?.hostUri);

  // In development, keep API host aligned with Metro host to avoid stale LAN IPs.
  if (__DEV__ && devHost) {
    if (!envUrl) {
      return `http://${devHost}:${DEFAULT_API_PORT}`;
    }

    const parsedEnvUrl = tryParseUrl(envUrl);
    if (parsedEnvUrl && isLocalHost(parsedEnvUrl.hostname)) {
      const port = parsedEnvUrl.port || DEFAULT_API_PORT;
      const suffix =
        parsedEnvUrl.pathname === "/" &&
        !parsedEnvUrl.search &&
        !parsedEnvUrl.hash
          ? ""
          : `${parsedEnvUrl.pathname}${parsedEnvUrl.search}${parsedEnvUrl.hash}`;
      return `${parsedEnvUrl.protocol}//${devHost}:${port}${suffix}`;
    }
  }

  if (envUrl) return envUrl;

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
};

export const API_URL = resolveApiUrl();

/** Error normalized from a NestJS exception payload. `code` carries
 * client-actionable error codes (e.g. TABLE_HAS_ACTIVE_ORDER). */
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
  }
}

const toApiError = (error: AxiosError): ApiError => {
  const data = error.response?.data as
    { message?: string | string[]; code?: string } | undefined;

  const rawMessage = data?.message ?? error.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(", ")
    : rawMessage || "Something went wrong";

  if (!error.response) {
    return new ApiError(
      "Unable to reach the server. Check your connection and try again.",
    );
  }

  return new ApiError(message, {
    code: data?.code,
    status: error.response.status,
  });
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh request.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    // Plain axios (not `api`) so the request interceptor doesn't overwrite
    // the refresh token with the expired access token.
    const response = await axios.post<RefreshResponse>(
      `${API_URL}/auth/refresh`,
      null,
      {
        headers: { Authorization: `Bearer ${refreshToken}` },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    useAuthStore.getState().setTokens(response.data);
    return response.data.accessToken;
  } catch {
    return null;
  }
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/sign-in") || url.includes("/auth/refresh");

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      !isAuthEndpoint &&
      useAuthStore.getState().isAuthenticated;

    if (shouldAttemptRefresh) {
      original._retry = true;

      refreshPromise =
        refreshPromise ??
        refreshAccessToken().finally(() => {
          refreshPromise = null;
        });

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api.request(original);
      }

      // Refresh token rejected — the session is over.
      useAuthStore.getState().logout();
    }

    throw toApiError(error);
  },
);
