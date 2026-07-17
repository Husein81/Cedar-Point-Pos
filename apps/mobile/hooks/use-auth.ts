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

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: {
      id: string;
      email?: string;
      phone?: string;
      username?: string;
    }) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      useAuthStore.getState().setUser(updatedUser);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
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
