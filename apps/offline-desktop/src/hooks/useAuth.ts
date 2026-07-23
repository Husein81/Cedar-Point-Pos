import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@repo/ui";
import { invoke } from "@/lib/ipc";
import { useAuthStore } from "@/store/authStore";
import { extractErrorMessage } from "@/utils/error";
import type { LoginInput, UserInput } from "@/shared/schemas";

export const useBootstrap = () =>
  useQuery({
    queryKey: ["auth", "bootstrap"],
    queryFn: () => invoke("auth:bootstrap", undefined),
    staleTime: Infinity,
  });

export const useLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: LoginInput) => invoke("auth:login", input),
    onSuccess: (user) => {
      setUser(user);
      toast.success(`Welcome back, ${user.name}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Login failed"));
    },
  });
};

// Silent — used on app launch to restore a remembered session. Failure just
// means "show the login screen", so it deliberately has no onError toast.
export const useResumeSession = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (userId: string) => invoke("auth:resume", { userId }),
    onSuccess: (user) => {
      setUser(user);
    },
  });
};

export const useSetup = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: UserInput) => invoke("auth:setup", input),
    onSuccess: (user) => {
      setUser(user);
      toast.success("Your business is ready!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Setup failed"));
    },
  });
};

export const useLogout = () => {
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: () => invoke("auth:logout", undefined),
    onSettled: () => {
      clearUser();
    },
  });
};
