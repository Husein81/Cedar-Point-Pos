import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { useMutation } from "@tanstack/react-query";

export function useSignIn() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: { username: string; password: string }) =>
      await authService.signIn(data),
    onSuccess: (data) => {
      setAuth({
        token: data.accessToken,
        user: data.user,
      });
    },
  });
}
