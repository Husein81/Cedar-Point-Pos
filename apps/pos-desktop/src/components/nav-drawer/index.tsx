import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import { Button, cn, Icon, Shad } from "@repo/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { sidebarSections } from "./config";
import NavUser from "./nav-user";
import logo from "/assets/logo.png";

type NavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NavDrawer = ({ open, onOpenChange }: NavDrawerProps) => {
  const pathname = useLocation().pathname;
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [toggle, setToggle] = useState<Record<string, boolean>>(
    Object.fromEntries(sidebarSections.map((section) => [section.label, true])),
  );

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleNavigation = (href: string) => {
    navigate({ to: href });
    onOpenChange(false);
  };

  return (
    <Shad.Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <Shad.DrawerContent className="h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <Shad.DrawerHeader className="border-b">
            <Shad.DrawerTitle className="flex items-center gap-4 text-lg font-semibold">
              <img
                src={logo}
                className="w-8 h-8 dark:invert-0 invert"
                alt="cedar point"
              />
              CedarPoint POS
            </Shad.DrawerTitle>
          </Shad.DrawerHeader>

          {/* Content */}
          <Shad.ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Navigation Sections */}
              {sidebarSections.map((section) => (
                <Shad.Collapsible
                  open={toggle[section.label]}
                  onOpenChange={(isOpen: boolean) =>
                    setToggle((prev) => ({ ...prev, [section.label]: isOpen }))
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
                        {section.items
                          .filter((item) => {
                            return (
                              item.showFor.includes(
                                (user?.tenant?.businessType as BusinessType) ??
                                  "RETAIL",
                              ) && item.roles?.includes(user?.role || "CASHIER")
                            );
                          })
                          .map((item) => (
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
              ))}
            </div>
            <Shad.ScrollBar />
          </Shad.ScrollArea>

          {/* Footer */}
          <Shad.DrawerFooter className="border-t w-full">
            <NavUser />
          </Shad.DrawerFooter>
        </div>
      </Shad.DrawerContent>
    </Shad.Drawer>
  );
};

export default NavDrawer;
