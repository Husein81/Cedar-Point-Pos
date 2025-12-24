import { apiFetch } from '../apis/api';

export type AdminLoginPayload = {
  email: string;
  password: string;
};

export type AdminLoginResponse = {
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
};

export const adminAuthApi = {
  login: async (payload: AdminLoginPayload): Promise<AdminLoginResponse> => {
    return apiFetch('/auth/admin-sign-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout: async (): Promise<void> => {
    await apiFetch('/auth/logout', {
      method: 'POST',
    });
  },
};
