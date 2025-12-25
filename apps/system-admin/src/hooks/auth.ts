import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAuthApi, type AdminLoginPayload } from "../apis/authApi";
import { useAuthStore } from "@/store/authStore";

export const useLogin = () => {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminLoginPayload) => adminAuthApi.login(payload),
    onSuccess: (data) => {
      console.log("Logged in admin:", data.user);
      setUser(data.user);
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
      // Redirect handled by store's logout or manually
      window.location.href = "/login";
    },
    onError: () => {
      // Even if logout API fails, clear local state and redirect
      logout();
    },
  });
};

