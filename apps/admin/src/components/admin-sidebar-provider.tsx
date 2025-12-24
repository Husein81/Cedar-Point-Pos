"use client";

import * as React from "react";
import {
  SidebarProvider as BaseSidebarProvider,
  useSidebar as useBaseSidebar,
} from "@repo/ui/components/sidebar";

const STORAGE_KEY = "admin.sidebar.collapsed";

type AdminSidebarProviderProps = {
  children: React.ReactNode;
};

/**
 * Custom SidebarProvider that uses localStorage instead of cookies
 * for persisting collapsed state
 * 
 * Note: BaseSidebarProvider already includes TooltipProvider
 */
export function AdminSidebarProvider({ children }: AdminSidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsCollapsed(!open);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(!open));
    }
  }, []);

  return (
    <BaseSidebarProvider
      defaultOpen={!isCollapsed}
      open={!isCollapsed}
      onOpenChange={handleOpenChange}
    >
      {children}
    </BaseSidebarProvider>
  );
}

/**
 * Re-export useSidebar hook for convenience
 */
export { useBaseSidebar as useSidebar };

