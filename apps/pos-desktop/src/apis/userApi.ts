import { PublicUser } from "@repo/types";
import { api } from "../lib/api";
import { User } from "@repo/types";

export const userApi = {
  updateProfile: async (
    id: string,
    data: Partial<User>,
  ): Promise<PublicUser> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
};
