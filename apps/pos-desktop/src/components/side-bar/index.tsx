import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { Link, useLocation } from "@tanstack/react-router";
import { sidebarSections } from "./config";
import NavUser from "./nav-user";
import { useSidebar } from "@repo/ui"; // 👈 IMPORTANT

const Sidebar = ({ ...props }: React.ComponentProps<typeof Shad.Sidebar>) => {
  const pathname = useLocation().pathname;
  const { user } = useAuthStore();
  const { open, setOpen, isMobile } = useSidebar(); // 👈 control sidebar

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* 🔥 OVERLAY — click to close */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <Shad.Sidebar
        className="top-10 z-50"
        {...props}
        onClick={(e) => e.stopPropagation()} // 👈 prevent closing when clicking inside
      >
        <Shad.SidebarContent>
          <Shad.ScrollArea className="min-h-0">
            {/* POS */}
            <div className="flex-1">
              {sidebarSections.map((section) => (
                <Shad.SidebarGroup key={section.label}>
                  <Shad.SidebarGroupLabel>
                    {section.label}
                  </Shad.SidebarGroupLabel>

                  <Shad.SidebarMenu className="space-y-1">
                    {section.items
                      .filter((item) =>
                        item.showFor.includes(
                          (user?.tenant?.businessType as BusinessType) ??
                            "RETAIL"
                        )
                      )
                      .map((item) => (
                        <Shad.SidebarMenuItem key={item.label}>
                          <Link to={item.href || "/"}>
                            <Shad.SidebarMenuButton
                              onClick={() => {
                                if (isMobile) setOpen(false); // 👈 close on navigation
                              }}
                              className={cn(
                                "hover:text-gray-200 hover:bg-primary active:bg-accent/60 active:text-gray-200",
                                {
                                  "bg-primary text-gray-200": isActive(
                                    item.href
                                  ),
                                }
                              )}
                              tooltip={item.tooltip}
                            >
                              <Icon name={item.icon} />
                              <span>{item.label}</span>
                            </Shad.SidebarMenuButton>
                          </Link>
                        </Shad.SidebarMenuItem>
                      ))}
                  </Shad.SidebarMenu>
                </Shad.SidebarGroup>
              ))}
            </div>

            {/* Settings */}
            <Shad.SidebarGroup>
              <Shad.SidebarMenu>
                <Shad.SidebarMenuItem>
                  <Link to="/settings">
                    <Shad.SidebarMenuButton
                      onClick={() => {
                        if (isMobile) setOpen(false);
                      }}
                      className={cn(
                        "hover:text-gray-200 hover:bg-primary active:bg-accent/60 active:text-gray-200",
                        {
                          "bg-primary text-gray-200":
                            pathname === "/settings" ||
                            pathname.startsWith("/settings/"),
                        }
                      )}
                      tooltip="Settings"
                    >
                      <Icon name="Settings" className="w-4 h-4" />
                      <span>Settings</span>
                    </Shad.SidebarMenuButton>
                  </Link>
                </Shad.SidebarMenuItem>
              </Shad.SidebarMenu>
            </Shad.SidebarGroup>
          </Shad.ScrollArea>
        </Shad.SidebarContent>

        <Shad.SidebarFooter className="border-t mb-14 mt-2">
          <NavUser />
        </Shad.SidebarFooter>
      </Shad.Sidebar>
    </>
  );
};

export default Sidebar;
