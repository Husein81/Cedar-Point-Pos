import { Icon, Shad } from "@repo/ui";
import { Link } from "@tanstack/react-router";
import NavUser from "../nav-user";
import { sidebarSections } from "./config";

const Sidebar = ({ ...props }: React.ComponentProps<typeof Shad.Sidebar>) => {
  return (
    <Shad.Sidebar className="top-10" collapsible="icon" {...props}>
      {/* Content */}
      <Shad.SidebarContent>
        {/* POS */}
        {sidebarSections.map((section) => (
          <Shad.SidebarGroup key={section.label}>
            <Shad.SidebarGroupLabel>{section.label}</Shad.SidebarGroupLabel>
            <Shad.SidebarMenu>
              {section.items.map((item) => (
                <Shad.SidebarMenuItem key={item.label}>
                  <Link to={item.href || "/"}>
                    <Shad.SidebarMenuButton
                      className="hover:text-gray-200"
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
        <Shad.SidebarMenuItem>
          <Shad.SidebarMenuButton
            className="hover:text-gray-200"
            tooltip="Settings"
          >
            <Icon name="Settings" />
            <span>Settings</span>
          </Shad.SidebarMenuButton>
        </Shad.SidebarMenuItem>
      </Shad.SidebarFooter>
    </Shad.Sidebar>
  );
};

export default Sidebar;
