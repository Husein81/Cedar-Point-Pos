export type SidebarItem = {
  label: string;
  icon: string;
  tooltip?: string;
  href: string;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        icon: "LayoutDashboard",
        href: "/",
        tooltip: "Dashboard",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Tenants",
        icon: "Building2",
        href: "/tenants",
        tooltip: "Manage Tenants",
      },
      {
        label: "Users",
        icon: "Users",
        href: "/users",
        tooltip: "Manage Users",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "System Health",
        icon: "Activity",
        href: "/system-health",
        tooltip: "System Health",
      },
      {
        label: "Settings",
        icon: "Settings",
        href: "/settings",
        tooltip: "Settings",
      },
    ],
  },
];
