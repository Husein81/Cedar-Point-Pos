import { useAuthStore } from "@/store/authStore";
import type { BusinessType } from "@repo/types";
import { cn, Icon, Shad } from "@repo/ui";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import NavUser from "./nav-user";
import { sidebarSections } from "./config";
import Settings from "./settings";

const Sidebar = ({ ...props }: React.ComponentProps<typeof Shad.Sidebar>) => {
  const { user } = useAuthStore();
  const [active, setActive] = useState("Home");
  const isActive = (label: string) => label === active;

  return (
    <Shad.Sidebar className="top-10" collapsible="icon" {...props}>
      {/* Content */}
      <Shad.SidebarContent>
        {/* POS */}
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
                        onClick={() => setActive(item.label)}
                        className={cn("hover:text-gray-200 hover:bg-primary", {
                          "bg-primary text-gray-200": isActive(item.label),
                        })}
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
      </Shad.SidebarContent>

      {/* Footer */}
      <Shad.SidebarFooter className="border-t mb-10">
        <NavUser />
        <Settings />
      </Shad.SidebarFooter>
    </Shad.Sidebar>
  );
};

export default Sidebar;
