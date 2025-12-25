"use client";

import { Icon, Shad } from "@repo/ui";
import { adminAuthApi } from "@/apis/authApi";

const NavUser = () => {
  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Shad.SidebarMenu>
      <Shad.SidebarMenuItem>
        <Shad.DropdownMenu>
          <Shad.DropdownMenuTrigger asChild>
            <Shad.SidebarMenuButton
              size="lg"
              className="hover:bg-primary data-[state=open]:bg-primary/10"
            >
              <Shad.Avatar className="h-8 w-8 rounded-lg">
                <Shad.AvatarFallback className="rounded-lg">
                  SA
                </Shad.AvatarFallback>
              </Shad.Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">System Admin</span>
                <span className="truncate text-xs text-muted-foreground">
                  Administrator
                </span>
              </div>
              <Icon name="ChevronsUpDown" size={16} className="ml-auto" />
            </Shad.SidebarMenuButton>
          </Shad.DropdownMenuTrigger>
          <Shad.DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <Shad.DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Shad.Avatar className="h-8 w-8 rounded-lg">
                  <Shad.AvatarFallback className="rounded-lg">
                    SA
                  </Shad.AvatarFallback>
                </Shad.Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">System Admin</span>
                  <span className="truncate text-xs text-muted-foreground">
                    admin@pointverse.io
                  </span>
                </div>
              </div>
            </Shad.DropdownMenuLabel>
            <Shad.DropdownMenuSeparator />
            <Shad.DropdownMenuItem>
              <Icon name="Brush" className="mr-2" size={16} />
              <span>Appearance</span>
            </Shad.DropdownMenuItem>
            <Shad.DropdownMenuSeparator />
            <Shad.DropdownMenuItem
              className="hover:bg-destructive hover:text-gray-200"
              onSelect={() => handleLogout()}
            >
              <Icon name="LogOut" className="mr-2" size={16} />
              <span>Logout</span>
            </Shad.DropdownMenuItem>
          </Shad.DropdownMenuContent>
        </Shad.DropdownMenu>
      </Shad.SidebarMenuItem>
    </Shad.SidebarMenu>
  );
};

export default NavUser;
