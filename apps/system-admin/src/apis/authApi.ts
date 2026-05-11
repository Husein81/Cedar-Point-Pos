import { api } from "./api";

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type AdminLoginResponse = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const adminAuthApi = {
  login: async (payload: AdminLoginPayload): Promise<AdminLoginResponse> => {
    return api("/auth/admin-sign-in", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout: async (): Promise<void> => {
    await api("/auth/logout", {
      method: "POST",
    });
  },
};
