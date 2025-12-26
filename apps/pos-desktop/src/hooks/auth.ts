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
      console.log("Logged in user:", data.user);
      setUser(data.user);
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
  });
};
