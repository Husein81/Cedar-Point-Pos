import { useAuthStore } from "@/store/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAuthApi, type AdminLoginPayload } from "../apis/authApi";

export const useLogin = () => {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminLoginPayload) => adminAuthApi.login(payload),
    onSuccess: (data) => {
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ["current-admin"] });
    },
  });
};

export const useLogout = () => {
  const { logout, clearUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adminAuthApi.logout(),
    onSuccess: () => {
      clearUser();
      queryClient.invalidateQueries({ queryKey: ["current-admin"] });
      window.location.href = "/login";
    },
    onError: () => {
      logout();
    },
  });
};
