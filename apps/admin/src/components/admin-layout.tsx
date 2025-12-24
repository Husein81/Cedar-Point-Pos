"use client";

import * as React from "react";
import {
  SidebarInset,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";
import { AdminSidebar } from "./admin-sidebar";
import { AdminSidebarProvider } from "./admin-sidebar-provider";
import { cn } from "@repo/ui/libs/utils";

type AdminLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * AdminLayout component
 * - Wraps sidebar and content
 * - Handles mobile drawer via existing Sidebar components
 * - Provides responsive layout
 */
export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <AdminSidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          {/* Add header content here (user menu, notifications, etc.) */}
        </header>
        <main
          className={cn(
            "flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8",
            className
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </AdminSidebarProvider>
  );
}

