"use client";

import * as React from "react";
import { UserRole } from "@repo/types";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: string[];
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  hasPermission: (permissionKey: string) => boolean;
  hasRole: (role: UserRole) => boolean;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

/**
 * Permission mapping for roles
 * SYSTEM_ADMIN has all permissions
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    "admin:dashboard:read",
    "admin:tenants:read",
    "admin:branches:read",
    "admin:users:read",
    "admin:devices:read",
    "admin:subscriptions:read",
    "admin:logs:read",
    "admin:settings:read",
  ],
  OWNER: [],
  MANAGER: [],
  CASHIER: [],
  KITCHEN: [],
};

export function AuthProvider({
  children,
  user: userProp,
}: {
  children: React.ReactNode;
  user?: User | null;
}) {
  const [user, setUser] = React.useState<User | null>(userProp ?? null);
  const [isLoading, setIsLoading] = React.useState(!userProp);

  // In a real app, you'd fetch user from API or session
  React.useEffect(() => {
    if (!userProp) {
      // TODO: Fetch user from API/session
      // For now, we'll use a mock or get from localStorage
      const storedUser = localStorage.getItem("admin.user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Invalid stored user
        }
      }
      setIsLoading(false);
    }
  }, [userProp]);

  const hasPermission = React.useCallback(
    (permissionKey: string): boolean => {
      if (!user) return false;

      // Check explicit permissions first
      if (user.permissions?.includes(permissionKey)) {
        return true;
      }

      // Check role-based permissions
      const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
      return rolePermissions.includes(permissionKey);
    },
    [user]
  );

  const hasRole = React.useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

