import type { User } from "@repo/types";
import { api } from "./api";

export const authApi = {
  login: async (
    username: string,
    password: string
  ): Promise<{ accessToken: string; user: Omit<User, "password"> }> => {
    try {
      const response = await api.post("/auth/sign-in", {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
  logout: async (): Promise<{ message: string }> => {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },
};
