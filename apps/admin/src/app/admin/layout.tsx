"use client";

import { AdminLayout } from "@/components/admin-layout";
import { AuthProvider } from "@/contexts/auth-context";

/**
 * Admin layout for all /admin routes
 * Wraps content with sidebar navigation and auth context
 */
export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Get user from session/API
  // For now, using a mock user with ADMIN role
  const mockUser = {
    id: "1",
    email: "admin@example.com",
    name: "System Admin",
    role: "ADMIN" as const,
  };

  return (
    <AuthProvider user={mockUser}>
      <AdminLayout>{children}</AdminLayout>
    </AuthProvider>
  );
}

