"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

type PermissionGuardProps = {
  children: React.ReactNode;
  permissionKey: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
};

/**
 * PermissionGuard component
 * - Hides children if user doesn't have permission
 * - Optionally redirects unauthorized users
 */
export function PermissionGuard({
  children,
  permissionKey,
  fallback = null,
  redirectTo,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !hasPermission(permissionKey) && redirectTo) {
      router.push(redirectTo);
    }
  }, [hasPermission, permissionKey, isLoading, redirectTo, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission(permissionKey)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

