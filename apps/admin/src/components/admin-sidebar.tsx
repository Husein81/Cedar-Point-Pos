"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import { useSidebar } from "./admin-sidebar-provider";
import { useAuth } from "../contexts/auth-context";
import { adminNavItems } from "../lib/nav-config";
import { cn } from "@repo/ui/libs/utils";

/**
 * AdminSidebar component with navigation items
 * 
 * Features:
 * - ✅ Respects permissions (hides unauthorized items)
 * - ✅ Highlights active route (exact and nested routes)
 * - ✅ Shows tooltips when collapsed
 * - ✅ Smooth collapse/expand animations
 * - ✅ Responsive (mobile drawer, desktop fixed)
 * - ✅ Accessible (ARIA labels, keyboard navigation)
 * 
 * Implementation Checklist:
 * - ✅ Collapse persisted (localStorage: admin.sidebar.collapsed)
 * - ✅ Active route highlight
 * - ✅ Permissions respected
 * - ✅ Mobile drawer
 * - ✅ Tooltips when collapsed
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const { state } = useSidebar();

  // Filter nav items based on permissions
  const visibleItems = React.useMemo(
    () => adminNavItems.filter((item) => hasPermission(item.permissionKey)),
    [hasPermission]
  );

  // Check if a route is active (exact match or nested)
  const isActiveRoute = React.useCallback(
    (href: string): boolean => {
      if (href === "/admin") {
        return pathname === "/admin";
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>System Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      aria-label={item.label}
                    >
                      <Link href={item.href}>
                        <Icon className="shrink-0" />
                        <span
                          className={cn(
                            "transition-opacity duration-200",
                            state === "collapsed" && "opacity-0"
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

