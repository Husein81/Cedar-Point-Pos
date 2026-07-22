import type { PublicUser } from "@repo/types";
import { api } from "../lib/api";

export const authApi = {
  login: async (
    tenantCode: string,
    username: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: PublicUser;
  }> => {
    try {
      const response = await api.post("/auth/sign-in", {
        tenantCode,
        username,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.warn("Logout API call failed (possibly offline):", error);
    }
  },
};
