"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, Icon, Shad } from "@repo/ui";
import { sidebarSections } from "./config";
import NavUser from "./nav-user";

const Sidebar = ({ ...props }: React.ComponentProps<typeof Shad.Sidebar>) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <Shad.Sidebar collapsible="icon" {...props}>
      {/* Header */}
      <Shad.SidebarHeader>
        <Shad.SidebarMenu>
          <Shad.SidebarMenuItem>
            <Shad.SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-primary"
            >
              <Link href="/">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Icon
                    name="Shield"
                    size={18}
                    className="text-primary-foreground"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Pointverse</span>
                  <span className="truncate text-xs text-muted-foreground">
                    System Admin
                  </span>
                </div>
              </Link>
            </Shad.SidebarMenuButton>
          </Shad.SidebarMenuItem>
        </Shad.SidebarMenu>
      </Shad.SidebarHeader>

      {/* Content */}
      <Shad.SidebarContent>
        {sidebarSections.map((section) => (
          <Shad.SidebarGroup key={section.label}>
            <Shad.SidebarGroupLabel>{section.label}</Shad.SidebarGroupLabel>
            <Shad.SidebarMenu className="gap-1">
              {section.items.map((item) => (
                <Shad.SidebarMenuItem key={item.label}>
                  <Shad.SidebarMenuButton
                    asChild
                    className={cn(
                      "hover:text-gray-200 hover:bg-primary active:bg-accent/60 active:text-gray-200",
                      {
                        "bg-primary text-gray-200": isActive(item.href),
                      }
                    )}
                    tooltip={item.tooltip}
                  >
                    <Link href={item.href}>
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                    </Link>
                  </Shad.SidebarMenuButton>
                </Shad.SidebarMenuItem>
              ))}
            </Shad.SidebarMenu>
          </Shad.SidebarGroup>
        ))}
      </Shad.SidebarContent>

      {/* Footer */}
      <Shad.SidebarFooter className="border-t">
        <NavUser />
      </Shad.SidebarFooter>

      <Shad.SidebarRail />
    </Shad.Sidebar>
  );
};

export default Sidebar;
