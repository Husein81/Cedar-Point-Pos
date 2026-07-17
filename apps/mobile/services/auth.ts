import { api } from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/types";

export const authService = {
  signIn: async (data: {
    username: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/sign-in", data);
    return response.data;
  },

  me: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>("/auth/me");
    return response.data;
  },

  updateProfile: async (data: {
    id: string;
    email?: string;
    phone?: string;
    username?: string;
  }): Promise<AuthUser> => {
    const response = await api.put<AuthUser>(`/users/${data.id}`, {
      email: data.email,
      phone: data.phone,
      username: data.username,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};
