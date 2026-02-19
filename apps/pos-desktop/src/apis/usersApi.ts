import { api } from "./api";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export const usersApi = {
  getUsers: async (): Promise<UserListItem[]> => {
    const response = await api.get<UserListItem[]>("/users");
    return response.data;
  },
};
