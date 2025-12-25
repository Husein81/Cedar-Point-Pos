"use client";

import { Button, Icon, Shad } from "@repo/ui";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { adminAuthApi } from "@/apis/authApi";

interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({ title = "Dashboard", description }: HeaderProps) {
  const handleSignOut = async () => {
    try {
      await adminAuthApi.logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white border-b border-border px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shad.SidebarTrigger className="-ml-1" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="relative">
            <Icon name="Bell" size={18} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            <Icon name="LogOut" size={16} className="mr-2" />
            Sign Out
          </Button>
          <Avatar className="h-9 w-9">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              SA
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
