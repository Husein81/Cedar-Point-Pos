import { useAuthStore } from "@/store/authStore";
import { useOrderStore } from "@/store/orderStore";
import {
  UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { authApi } from "../apis/authApi";
import { PublicUser } from "@repo/types";

export const useLogin = (): UseMutationResult<
  {
    accessToken: string;
    refreshToken: string;
    user: PublicUser;
  },
  Error,
  {
    tenantCode: string;
    username: string;
    password: string;
  }
> => {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tenantCode,
      username,
      password,
    }: {
      tenantCode: string;
      username: string;
      password: string;
    }) => authApi.login(tenantCode, username, password),
    onSuccess: (data) => {
      // Store user data, access token, and the refresh token that keeps the
      // session alive without forcing a re-login on expiry.
      setUser(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Logged in successfully.");
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const { clearOrder } = useOrderStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      clearOrder();
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error) => {
      console.warn("Logout API failed, but logging out locally:", error);
      logout();
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
};
