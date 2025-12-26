"use client";

import { Shad } from "@repo/ui";
import Sidebar from "@/components/side-bar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shad.SidebarProvider defaultOpen={false}>
      <Sidebar />
      <Shad.SidebarInset className="flex-1 flex flex-col overflow-hidden">
        {children}
      </Shad.SidebarInset>
    </Shad.SidebarProvider>
  );
}
