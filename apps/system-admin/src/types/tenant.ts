import type { BusinessType, UserRole } from "@repo/types";

export type TenantWithCount = {
  id: string;
  name: string;
  code: string | null;
  businessType: BusinessType;
  createdAt: string;
  updatedAt: string;
  settings: unknown;
  _count: {
    users: number;
    branches: number;
  };
};

export type TenantUser = {
  id: string;
  name: string;
  email: string | null;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Get available roles based on business type
 * All business types currently support the same roles
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getAvailableRoles = (businessType: BusinessType): UserRole[] => {
  // Future: could differentiate roles by business type
  // e.g., RESTAURANT might have WAITER, CHEF roles
  return ["ADMIN", "MANAGER", "CASHIER"];
};

/**
 * Check if a tenant has an active admin user
 */
export const tenantHasAdmin = (users: TenantUser[]): boolean => {
  return users.some((user) => user.role === "ADMIN" && user.isActive);
};
