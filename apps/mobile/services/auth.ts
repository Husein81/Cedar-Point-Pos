import { apiRequest } from "@/lib/api";
interface LoginResponse {
  accessToken: string;
  user: any;
}
export const authService = {
  signIn: async (data: { username: string; password: string }) => {
    console.log("AuthService.signIn called with:", data);
    return await apiRequest<LoginResponse>("/auth/sign-in", {
      method: "POST",
      data,
    });
  },
};
