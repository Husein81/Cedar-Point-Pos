import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { AUTH_TOKEN_STORAGE_KEY } from "../constants/auth";

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login if not already on login page
      const isLoginRequest = error.config.url?.includes("/auth/sign-in");
      if (!isLoginRequest) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
