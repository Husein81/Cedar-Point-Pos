import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { Link, useLocation } from "@tanstack/react-router";
import { sidebarSections } from "./config";
import NavUser from "./nav-user";

const Sidebar = ({ ...props }: React.ComponentProps<typeof Shad.Sidebar>) => {
  const pathname = useLocation().pathname;
  const { user } = useAuthStore();

  const isActive = (label: string) => {
    return pathname === label.toLowerCase();
  };

  return (
    <Shad.Sidebar className="top-10" collapsible="icon" {...props}>
      {/* Content */}
      <Shad.SidebarContent>
        {/* POS */}
        <div className="flex-1">
          {sidebarSections.map((section) => (
            <Shad.SidebarGroup key={section.label}>
              <Shad.SidebarGroupLabel>{section.label}</Shad.SidebarGroupLabel>
              <Shad.SidebarMenu className="space-y-1">
                {section.items
                  .filter((item) =>
                    item.showFor.includes(
                      (user?.tenant?.businessType as BusinessType) ?? "RETAIL"
                    )
                  )
                  .map((item) => (
                    <Shad.SidebarMenuItem key={item.label}>
                      <Link to={item.href || "/"}>
                        <Shad.SidebarMenuButton
                          // onClick={() => setActive(item.href)}
                          className={cn(
                            "hover:text-gray-200 hover:bg-primary active:bg-accent/60 active:text-gray-200 ",
                            {
                              "bg-primary text-gray-200": isActive(item.href),
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
        <Shad.SidebarMenuItem className="mt-4 ml-2">
          <Shad.SidebarMenuButton
            className={cn(
              "hover:text-gray-200 hover:bg-primary active:bg-accent/60 active:text-gray-200 ",
              {
                "bg-primary text-gray-200": isActive("/settings"),
              }
            )}
          >
            <Icon name="Settings" className="size-4 " />
          </Shad.SidebarMenuButton>
        </Shad.SidebarMenuItem>
      </Shad.SidebarContent>

      {/* Footer */}
      <Shad.SidebarFooter className="border-t mb-14 mt-2">
        <NavUser />
      </Shad.SidebarFooter>
    </Shad.Sidebar>
  );
};

export default Sidebar;
