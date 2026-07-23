import { useLogout } from "@/hooks/auth";
import { useAuthStore } from "@/store/authStore";
import { AUTH_ROUTE } from "@/constants/auth";
import type { BusinessType } from "@repo/types";
import { Avatar, Button, cn, Icon, Shad } from "@repo/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { sidebarSections } from "./config";
import logo from "/assets/logo.png";

type NavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NavDrawer = ({ open, onOpenChange }: NavDrawerProps) => {
  const pathname = useLocation().pathname;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const [toggle, setToggle] = useState<Record<string, boolean>>(
    Object.fromEntries(sidebarSections.map((section) => [section.label, true])),
  );

  const isActive = (href: string) => {
    if (pathname === "/tables" && href === "/") return true;

    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleNavigation = (href: string) => {
    navigate({ to: href });
    onOpenChange(false);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    navigate({ to: AUTH_ROUTE });
    await logoutMutation.mutateAsync();
  };

  return (
    <Shad.Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <Shad.DrawerContent className="h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <Shad.DrawerHeader className="border-b">
            <Shad.DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
              <img
                src={logo}
                className="w-8 h-8 dark:invert-0 invert"
                alt="cedar point"
              />
              <span className="text-lg font-semibold text-text">
                Cedar
                <span className="text-primary font-bold">Point</span>
              </span>
            </Shad.DrawerTitle>
          </Shad.DrawerHeader>

          {/* Content */}
          <Shad.ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Navigation Sections */}
              {sidebarSections.map((section) => {
                const visibleItems = section.items.filter(
                  (item) =>
                    item.showFor.includes(
                      (user?.tenant?.businessType as BusinessType) ?? "RETAIL",
                    ) && item.roles?.includes(user?.role || "CASHIER"),
                );

                // Don't render a section header when the role/business type
                // leaves it with no items (e.g. "Management" for a cashier).
                if (visibleItems.length === 0) return null;

                return (
                  <Shad.Collapsible
                    open={toggle[section.label]}
                    onOpenChange={(isOpen: boolean) =>
                      setToggle((prev) => ({
                        ...prev,
                        [section.label]: isOpen,
                      }))
                    }
                    key={section.label}
                  >
                    <div className="space-y-2">
                      <Shad.CollapsibleTrigger asChild>
                        <span className="flex justify-between items-center gap-2 w-full px-2 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                          <span>{section.label}</span>
                          <Icon
                            name={
                              toggle[section.label]
                                ? "ChevronDown"
                                : "ChevronRight"
                            }
                            className="w-4 h-4"
                          />
                        </span>
                      </Shad.CollapsibleTrigger>
                      <Shad.CollapsibleContent>
                        <div className="space-y-1">
                          {visibleItems.map((item) => (
                            <Button
                              key={item.href}
                              variant="ghost"
                              className={cn(
                                "flex justify-start w-full",
                                "hover:bg-primary hover:text-primary-foreground",
                                {
                                  "bg-primary text-primary-foreground":
                                    isActive(item.href),
                                },
                              )}
                              onClick={() => handleNavigation(item.href)}
                            >
                              <Icon name={item.icon} className="w-4 h-4" />
                              <span>{item.label}</span>
                            </Button>
                          ))}
                        </div>
                      </Shad.CollapsibleContent>
                    </div>
                  </Shad.Collapsible>
                );
              })}
            </div>
            <Shad.ScrollBar />
          </Shad.ScrollArea>

          {/* Footer */}
          <Shad.DrawerFooter className="border-t w-full">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {user?.name && <Avatar fallback={user.name} />}
                <div className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="truncate text-sm font-medium">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  iconName="Settings"
                  onClick={() => handleNavigation("/settings")}
                  className={cn(isActive("/settings") && "text-primary")}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  iconName="LogOut"
                  onClick={handleLogout}
                />
              </div>
            </div>
          </Shad.DrawerFooter>
        </div>
      </Shad.DrawerContent>
    </Shad.Drawer>
  );
};

export default NavDrawer;
