import axios, { isAxiosError, type AxiosRequestConfig, type Method } from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "@/store/auth";

const DEFAULT_API_PORT = "5001";

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

const API_URL = resolveApiUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  data?: unknown;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Ensure endpoint starts with / and API_URL doesn't end with /
  const sanitizedBase = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const sanitizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const headerRecord: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerRecord[key] = value;
  });

  const parsedBody = (() => {
    if (options.data !== undefined) return options.data;
    if (options.body === undefined || options.body === null) return undefined;
    if (typeof options.body !== "string") return options.body;

    try {
      return JSON.parse(options.body);
    } catch {
      return options.body;
    }
  })();

  const request = async (baseUrl: string) => {
    const config: AxiosRequestConfig = {
      baseURL: baseUrl,
      url: sanitizedEndpoint,
      method: (options.method ?? "GET") as Method,
      params: options.params,
      data: parsedBody,
      headers: headerRecord,
      signal: options.signal ?? undefined,
    };

    const response = await axios.request<T>(config);
    return response.data;
  };

  try {
    return await request(sanitizedBase);
  } catch (error) {
    const parsedBase = tryParseUrl(sanitizedBase);
    const shouldTryAndroidEmulatorFallback =
      Platform.OS === "android" &&
      __DEV__ &&
      isAxiosError(error) &&
      !error.response &&
      parsedBase &&
      isLocalHost(parsedBase.hostname) &&
      parsedBase.hostname !== "10.0.2.2";

    if (shouldTryAndroidEmulatorFallback) {
      const fallbackBase = `${parsedBase.protocol}//10.0.2.2:${
        parsedBase.port || DEFAULT_API_PORT
      }`;

      try {
        return await request(fallbackBase);
      } catch (fallbackError) {
        if (isAxiosError(fallbackError)) {
          const fallbackMessage =
            (
              fallbackError.response?.data as { message?: string | string[] }
            )?.message ?? fallbackError.message;
          throw new Error(
            Array.isArray(fallbackMessage)
              ? fallbackMessage.join(", ")
              : fallbackMessage || "Something went wrong",
          );
        }
        throw fallbackError;
      }
    }

    if (isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string | string[] })?.message ??
        error.message;
      throw new Error(
        Array.isArray(message) ? message.join(", ") : message || "Something went wrong",
      );
    }

    throw error;
  }
}
