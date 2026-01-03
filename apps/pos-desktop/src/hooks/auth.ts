import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../apis/authApi";
import { useAuthStore } from "@/store/authStore";

export const useLogin = () => {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      username,
      password,
    }: {
      username: string;
      password: string;
    }) => authApi.login(username, password),
    onSuccess: (data) => {
      // Store both user data and access token
      setUser(data.user, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error) => {
      console.warn("Logout API failed, but logging out locally:", error);
      logout();
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
};
