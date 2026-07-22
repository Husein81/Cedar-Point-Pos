import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";
import {
  AUTH_REFRESH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "../constants/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000, // 30 seconds to handle long-running operations
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints a 401 must never try to "refresh" its way out of: sign-in and
// refresh itself would recurse, and PIN login issues no refresh token at all
// (8h, terminal re-authenticates per shift — a deliberate design, see
// CLAUDE.md §17).
const NON_REFRESHABLE_PATHS = ["/auth/sign-in", "/auth/refresh", "/auth/pin-login"];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Concurrent 401s share a single in-flight refresh instead of each firing
// their own /auth/refresh call; every queued request awaits the same promise
// and retries once it resolves.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {},
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );

  const { accessToken, refreshToken: nextRefreshToken } = response.data as {
    accessToken: string;
    refreshToken: string;
  };

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, nextRefreshToken);
  useAuthStore.setState({ token: accessToken });

  return accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isNonRefreshable = NON_REFRESHABLE_PATHS.some((path) =>
      config?.url?.includes(path),
    );

    if (error.response?.status !== 401 || !config || isNonRefreshable) {
      return Promise.reject(error);
    }

    // Only ever retry a given request once, so a still-invalid refreshed
    // token can't loop forever.
    if (config._retried) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
    config._retried = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const accessToken = await refreshPromise;

      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch {
      // Refresh token itself is invalid/expired (or this is a PIN session with
      // none stored) — there is no way to silently recover, so fall back to
      // the original behavior.
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
  },
);
