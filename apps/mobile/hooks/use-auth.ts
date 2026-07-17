import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/auth";
import { useBranchStore } from "@/store/branch";
import { useCartStore } from "@/store/cart";

export function useSignIn() {
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      authService.signIn(data),
    onSuccess: (data) => {
      useAuthStore.getState().setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Best-effort server logout (blacklists the token); the local session
      // is cleared regardless so the user is never stuck signed in.
      try {
        await authService.logout();
      } catch {
        // Offline or already-expired token — local logout still proceeds.
      }
    },
    onSettled: () => {
      useAuthStore.getState().logout();
      useBranchStore.getState().clearBranch();
      useCartStore.getState().clear();
      queryClient.clear();
    },
  });
}
