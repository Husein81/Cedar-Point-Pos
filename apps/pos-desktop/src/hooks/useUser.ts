import { useAuthStore } from "@/store/authStore";
import { PublicUser, User } from "@repo/types";
import {
  UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { userApi } from "../apis/userApi";

export const useUpdateProfile = (): UseMutationResult<
  PublicUser,
  Error,
  Partial<User>
> => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: Partial<User>) => {
      if (!user?.id) throw new Error("User not found");
      return userApi.updateProfile(user.id, data);
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    },
  });
};
