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
      <Shad.SidebarTrigger className="ml-2 mt-2" />
      <Shad.SidebarContent>
        {/* POS */}
        <Shad.ScrollArea>
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
        </Shad.ScrollArea>
      </Shad.SidebarContent>

      {/* Footer */}
      <Shad.SidebarFooter className="border-t mb-14 mt-2">
        <NavUser />
      </Shad.SidebarFooter>
    </Shad.Sidebar>
  );
};

export default Sidebar;
